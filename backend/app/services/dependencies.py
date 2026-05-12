from datetime import datetime, timedelta
from fastapi import HTTPException
from supabase import Client

from app.core.deps import RequestContext
from app.schemas.common import TaskDependencyCreate


class TaskDependencyService:
    @classmethod
    def list_dependencies(cls, supabase: Client, task_id: str, ctx: RequestContext):
        query = (
            supabase.table("task_dependencies")
            .select("*, depends_on:tasks!task_dependencies_depends_on_task_id_fkey(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("task_id", task_id)
        )
        return query.execute().data or []

    @classmethod
    def create_dependency(cls, supabase: Client, task_id: str, payload: TaskDependencyCreate, ctx: RequestContext):
        # Prevent circular dependencies (basic check)
        if task_id == payload.depends_on_task_id:
            raise HTTPException(status_code=400, detail="A task cannot depend on itself")

        # Check for direct circular dependency
        exists = (
            supabase.table("task_dependencies")
            .select("id")
            .eq("tenant_id", ctx.tenant_id)
            .eq("task_id", payload.depends_on_task_id)
            .eq("depends_on_task_id", task_id)
            .maybe_single()
            .execute()
        )
        if exists.data:
            raise HTTPException(status_code=400, detail="Circular dependency detected")

        body = {
            "tenant_id": ctx.tenant_id,
            "task_id": task_id,
            "depends_on_task_id": payload.depends_on_task_id,
            "dependency_type": payload.dependency_type,
        }
        resp = supabase.table("task_dependencies").insert(body).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create dependency")
        
        # Trigger rescheduling
        cls.reschedule_successors(supabase, payload.depends_on_task_id, ctx)
        
        return resp.data[0]

    @classmethod
    def delete_dependency(cls, supabase: Client, task_id: str, depends_on_task_id: str, ctx: RequestContext):
        resp = (
            supabase.table("task_dependencies")
            .delete()
            .eq("tenant_id", ctx.tenant_id)
            .eq("task_id", task_id)
            .eq("depends_on_task_id", depends_on_task_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Dependency not found")
        return {"status": "success"}

    @classmethod
    def reschedule_successors(cls, supabase: Client, task_id: str, ctx: RequestContext, visited: set[str] = None):
        if visited is None:
            visited = set()
        
        if task_id in visited:
            return # Circularity safety
        visited.add(task_id)

        # Get the task details
        task_resp = supabase.table("tasks").select("id, start_date, due_date").eq("id", task_id).maybe_single().execute()
        task = task_resp.data
        if not task or not task["due_date"]:
            return

        pred_due_date = datetime.fromisoformat(task["due_date"].replace('Z', '+00:00'))

        # Find all direct successors
        successors_resp = (
            supabase.table("task_dependencies")
            .select("*, successor:tasks!task_dependencies_task_id_fkey(*)")
            .eq("tenant_id", ctx.tenant_id)
            .eq("depends_on_task_id", task_id)
            .execute()
        )
        successors = successors_resp.data or []

        for dep in successors:
            successor = dep["successor"]
            dep_type = dep["dependency_type"]
            
            changed = False
            s_start = datetime.fromisoformat(successor["start_date"].replace('Z', '+00:00')) if successor["start_date"] else None
            s_due = datetime.fromisoformat(successor["due_date"].replace('Z', '+00:00')) if successor["due_date"] else None
            
            duration = (s_due - s_start) if (s_due and s_start) else timedelta(days=1)

            if dep_type == 'FS':
                # Successor start date must be >= Predecessor due date
                if not s_start or s_start < pred_due_date:
                    s_start = pred_due_date
                    s_due = s_start + duration
                    changed = True
            
            if changed:
                supabase.table("tasks").update({
                    "start_date": s_start.isoformat(),
                    "due_date": s_due.isoformat()
                }).eq("id", successor["id"]).execute()
                
                # Recursively reschedule successors of the updated task
                cls.reschedule_successors(supabase, successor["id"], ctx, visited)

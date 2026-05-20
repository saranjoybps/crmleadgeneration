from fastapi import APIRouter

from app.api.routes import auth, projects, tasks, tickets, users, workspace, dashboard, comments, todos, milestones, rbac, departments, vault, attendance, recruitment, documents

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(workspace.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(tickets.router)
api_router.include_router(tasks.router)
api_router.include_router(milestones.router)
api_router.include_router(dashboard.router)
api_router.include_router(comments.router)
api_router.include_router(todos.router)
api_router.include_router(rbac.router)
api_router.include_router(departments.router)
api_router.include_router(vault.router)
api_router.include_router(attendance.router)
api_router.include_router(recruitment.router)
api_router.include_router(documents.router)

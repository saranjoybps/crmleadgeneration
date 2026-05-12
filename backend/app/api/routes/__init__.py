from fastapi import APIRouter

from app.api.routes import auth, projects, tasks, tickets, users, workspace, dashboard, comments, todos, milestones

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

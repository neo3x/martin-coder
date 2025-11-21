"""
API Router - Main router combining all route modules
"""

from fastapi import APIRouter

from app.api.endpoints import auth, users, projects, chat, ai, files

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])

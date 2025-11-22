"""
API Router - Main router combining all route modules
"""

from fastapi import APIRouter

from app.api.endpoints import auth, users, projects, chat, ai, files, oauth, templates, plugins

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["OAuth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(plugins.router, prefix="/plugins", tags=["Plugins"])

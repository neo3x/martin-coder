"""
AI Provider Endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.models.user import User
from app.services.ai.router import ai_router
from app.schemas.ai import AIProvider, AIModel

router = APIRouter()


@router.get("/providers", response_model=List[AIProvider])
async def list_providers(
    current_user: User = Depends(get_current_user)
):
    """List available AI providers"""
    return await ai_router.get_available_providers()


@router.get("/health")
async def ai_health_check(
    current_user: User = Depends(get_current_user)
):
    """Check health of all AI providers"""
    return await ai_router.health_check()


@router.get("/providers/{provider_name}/models")
async def get_provider_models(
    provider_name: str,
    current_user: User = Depends(get_current_user)
):
    """Get available models for a provider"""
    try:
        provider = ai_router.get_provider(provider_name)
        if await provider.is_available():
            models = await provider.get_models()
            return {
                "provider": provider_name,
                "models": models,
                "default": provider.default_model
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Provider {provider_name} is not available"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

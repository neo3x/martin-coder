"""
Templates Endpoints - Project scaffolding
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.templates import template_manager, BUILTIN_TEMPLATES

router = APIRouter()


class TemplateInfo(BaseModel):
    """Template information response"""
    id: str
    name: str
    description: str
    language: str
    framework: Optional[str] = None
    category: str
    tags: List[str]


class CreateProjectRequest(BaseModel):
    """Request to create project from template"""
    template_id: str
    output_path: str
    variables: Optional[Dict[str, Any]] = None


class CreateProjectResponse(BaseModel):
    """Response after creating project"""
    template: str
    path: str
    files_created: List[str]
    post_create_commands: List[str]
    variables_used: Dict[str, Any]


# Register builtin templates on module load
for template in BUILTIN_TEMPLATES:
    template_manager.register(template)


@router.get("", response_model=List[TemplateInfo])
async def list_templates(
    language: Optional[str] = None,
    framework: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List available project templates"""
    templates = template_manager.list_templates(
        language=language,
        framework=framework,
        category=category
    )
    return [
        TemplateInfo(
            id=t.id,
            name=t.name,
            description=t.description,
            language=t.language,
            framework=t.framework,
            category=t.category,
            tags=t.tags
        )
        for t in templates
    ]


@router.get("/categories")
async def list_categories(
    current_user: User = Depends(get_current_user)
):
    """Get all template categories"""
    return {"categories": template_manager.get_categories()}


@router.get("/languages")
async def list_languages(
    current_user: User = Depends(get_current_user)
):
    """Get all template languages"""
    return {"languages": template_manager.get_languages()}


@router.get("/{template_id}", response_model=TemplateInfo)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get template details"""
    template = template_manager.get(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template not found: {template_id}"
        )

    return TemplateInfo(
        id=template.id,
        name=template.name,
        description=template.description,
        language=template.language,
        framework=template.framework,
        category=template.category,
        tags=template.tags
    )


@router.post("/create", response_model=CreateProjectResponse)
async def create_from_template(
    request: CreateProjectRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a new project from template"""
    try:
        result = await template_manager.create_project(
            template_id=request.template_id,
            output_path=request.output_path,
            variables=request.variables
        )
        return CreateProjectResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )

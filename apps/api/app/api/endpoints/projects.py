"""
Project Management Endpoints
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Project, ProjectFile
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectFileResponse,
    ProjectAnalysis
)
from app.services.project import ProjectService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's projects"""
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    projects = result.scalars().all()

    # Add file counts
    response = []
    for project in projects:
        count_result = await db.execute(
            select(func.count(ProjectFile.id))
            .where(ProjectFile.project_id == project.id)
        )
        file_count = count_result.scalar() or 0

        project_dict = ProjectResponse.model_validate(project).model_dump()
        project_dict["file_count"] = file_count
        response.append(ProjectResponse(**project_dict))

    return response


@router.post("", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    project = Project(
        **project_in.model_dump(),
        owner_id=current_user.id
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Analyze project if path is provided
    if project.local_path or project.git_url:
        try:
            project_service = ProjectService(db)
            await project_service.analyze_project(project)
        except (ValueError, OSError) as e:
            logger.warning("Project analysis skipped: %s", e)

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get project by ID"""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project"""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)

    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project"""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    await db.delete(project)
    await db.commit()

    return {"message": "Project deleted"}


@router.get("/{project_id}/files", response_model=List[ProjectFileResponse])
async def list_project_files(
    project_id: str,
    path: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List files in a project"""
    # Verify project ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Get files
    query = select(ProjectFile).where(ProjectFile.project_id == project_id)

    if path:
        query = query.where(ProjectFile.path.startswith(path))

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{project_id}/analyze", response_model=ProjectAnalysis)
async def analyze_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze a project structure and dependencies"""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    project_service = ProjectService(db)
    analysis = await project_service.analyze_project(project)

    return analysis


@router.post("/{project_id}/index")
async def index_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Index project for RAG search"""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    project_service = ProjectService(db)
    indexed_count = await project_service.index_project_for_rag(project)

    return {
        "message": "Project indexed successfully",
        "files_indexed": indexed_count
    }

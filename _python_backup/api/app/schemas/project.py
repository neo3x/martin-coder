"""
Project Schemas
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    """Base project schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Schema for creating a project"""
    local_path: Optional[str] = None
    git_url: Optional[str] = None
    git_branch: str = "main"
    settings: Optional[Dict[str, Any]] = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    local_path: Optional[str] = None
    git_url: Optional[str] = None
    git_branch: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectFileResponse(BaseModel):
    """Schema for project file response"""
    id: str
    path: str
    name: str
    extension: Optional[str] = None
    language: Optional[str] = None
    size_bytes: int
    line_count: int
    is_indexed: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectResponse(ProjectBase):
    """Schema for project response"""
    id: str
    local_path: Optional[str] = None
    git_url: Optional[str] = None
    git_branch: str
    detected_language: Optional[str] = None
    detected_framework: Optional[str] = None
    project_type: Optional[str] = None
    is_active: bool
    is_indexed: bool
    last_indexed_at: Optional[datetime] = None
    owner_id: str
    created_at: datetime
    updated_at: datetime
    file_count: Optional[int] = None

    class Config:
        from_attributes = True


class ProjectStructure(BaseModel):
    """Schema for project structure (file tree)"""
    name: str
    path: str
    type: str  # "file" or "directory"
    children: Optional[List["ProjectStructure"]] = None
    language: Optional[str] = None
    size_bytes: Optional[int] = None


ProjectStructure.model_rebuild()


class ProjectAnalysis(BaseModel):
    """Schema for project analysis result"""
    project_id: str
    languages: Dict[str, int]  # language -> file count
    frameworks: List[str]
    dependencies: Dict[str, str]  # dependency -> version
    file_count: int
    total_lines: int
    structure: ProjectStructure

"""
Project Model
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid

from app.core.database import Base


class Project(Base):
    """Project model for code projects"""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Path (local or remote)
    local_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    git_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    git_branch: Mapped[str] = mapped_column(String(100), default="main")

    # Project type detection
    detected_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    detected_framework: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    project_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Settings
    settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_indexed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_indexed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Owner
    owner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="projects")
    files: Mapped[List["ProjectFile"]] = relationship(
        "ProjectFile",
        back_populates="project",
        cascade="all, delete-orphan"
    )
    chats: Mapped[List["Chat"]] = relationship(
        "Chat",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Project {self.name}>"


class ProjectFile(Base):
    """Cached file information for a project"""

    __tablename__ = "project_files"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )

    # File info
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    extension: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Content hash for change detection
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    line_count: Mapped[int] = mapped_column(Integer, default=0)

    # Code analysis
    symbols: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    imports: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # RAG
    is_indexed: Mapped[bool] = mapped_column(Boolean, default=False)
    embedding_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="files")

    def __repr__(self):
        return f"<ProjectFile {self.path}>"

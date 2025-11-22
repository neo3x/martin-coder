"""
Project Templates - Scaffolding for new projects
"""

from app.services.templates.manager import TemplateManager, ProjectTemplate
from app.services.templates.builtin import BUILTIN_TEMPLATES

__all__ = ["TemplateManager", "ProjectTemplate", "BUILTIN_TEMPLATES"]

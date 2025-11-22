"""
Template Manager - Handle project templates
"""

from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, field
import json
import aiofiles
import logging
from jinja2 import Environment, BaseLoader

logger = logging.getLogger(__name__)


@dataclass
class TemplateFile:
    """Represents a file in a template"""
    path: str
    content: str
    is_template: bool = True  # If True, content will be rendered with Jinja2


@dataclass
class ProjectTemplate:
    """Project template definition"""
    id: str
    name: str
    description: str
    language: str
    framework: Optional[str] = None
    category: str = "general"
    tags: List[str] = field(default_factory=list)
    variables: Dict[str, Any] = field(default_factory=dict)
    files: List[TemplateFile] = field(default_factory=list)
    post_create_commands: List[str] = field(default_factory=list)
    dependencies: Dict[str, str] = field(default_factory=dict)


class TemplateManager:
    """Manager for project templates"""

    def __init__(self):
        self._templates: Dict[str, ProjectTemplate] = {}
        self._jinja_env = Environment(loader=BaseLoader())

    def register(self, template: ProjectTemplate):
        """Register a template"""
        self._templates[template.id] = template
        logger.debug(f"Registered template: {template.id}")

    def unregister(self, template_id: str):
        """Unregister a template"""
        self._templates.pop(template_id, None)

    def get(self, template_id: str) -> Optional[ProjectTemplate]:
        """Get template by ID"""
        return self._templates.get(template_id)

    def list_templates(
        self,
        language: Optional[str] = None,
        framework: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[ProjectTemplate]:
        """List templates with optional filters"""
        templates = list(self._templates.values())

        if language:
            templates = [t for t in templates if t.language == language]
        if framework:
            templates = [t for t in templates if t.framework == framework]
        if category:
            templates = [t for t in templates if t.category == category]

        return templates

    def get_categories(self) -> List[str]:
        """Get all template categories"""
        return list(set(t.category for t in self._templates.values()))

    def get_languages(self) -> List[str]:
        """Get all template languages"""
        return list(set(t.language for t in self._templates.values()))

    async def create_project(
        self,
        template_id: str,
        output_path: str,
        variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a project from template"""
        template = self.get(template_id)
        if not template:
            raise ValueError(f"Template not found: {template_id}")

        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Merge variables
        all_variables = {**template.variables, **(variables or {})}

        # Create files
        created_files = []
        for template_file in template.files:
            file_path = output_dir / template_file.path

            # Render path (may contain variables)
            if template_file.is_template:
                rendered_path = self._jinja_env.from_string(
                    template_file.path
                ).render(**all_variables)
                file_path = output_dir / rendered_path

            # Create parent directories
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # Render content if it's a template
            if template_file.is_template:
                content = self._jinja_env.from_string(
                    template_file.content
                ).render(**all_variables)
            else:
                content = template_file.content

            # Write file
            async with aiofiles.open(file_path, 'w') as f:
                await f.write(content)

            created_files.append(str(file_path.relative_to(output_dir)))

        return {
            "template": template_id,
            "path": str(output_dir),
            "files_created": created_files,
            "post_create_commands": template.post_create_commands,
            "variables_used": all_variables
        }

    def render_template_string(self, template_str: str, variables: Dict[str, Any]) -> str:
        """Render a template string with variables"""
        return self._jinja_env.from_string(template_str).render(**variables)


# Global template manager
template_manager = TemplateManager()

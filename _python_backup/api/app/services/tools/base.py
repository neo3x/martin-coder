"""
Base Tool and Tool Registry
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


class ToolParameter(BaseModel):
    """Tool parameter definition"""
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None
    enum: Optional[List[str]] = None


class ToolDefinition(BaseModel):
    """Tool definition for AI"""
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema format


class ToolResult(BaseModel):
    """Result of tool execution"""
    success: bool
    result: Any
    error: Optional[str] = None


class BaseTool(ABC):
    """Abstract base class for all tools"""

    name: str = "base_tool"
    description: str = "Base tool"
    parameters: List[ToolParameter] = []

    def __init__(self, project_path: Optional[str] = None):
        self.project_path = project_path

    def get_definition(self) -> ToolDefinition:
        """Get tool definition in JSON Schema format"""
        properties = {}
        required = []

        for param in self.parameters:
            prop = {
                "type": param.type,
                "description": param.description
            }
            if param.enum:
                prop["enum"] = param.enum
            if param.default is not None:
                prop["default"] = param.default

            properties[param.name] = prop

            if param.required:
                required.append(param.name)

        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters={
                "type": "object",
                "properties": properties,
                "required": required
            }
        )

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with given arguments"""
        pass

    def validate_args(self, **kwargs) -> Optional[str]:
        """Validate arguments against parameters"""
        for param in self.parameters:
            if param.required and param.name not in kwargs:
                return f"Missing required parameter: {param.name}"

            if param.name in kwargs and param.enum:
                if kwargs[param.name] not in param.enum:
                    return f"Invalid value for {param.name}. Must be one of: {param.enum}"

        return None


class ToolRegistry:
    """Registry for managing available tools"""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):
        """Register a tool"""
        self._tools[tool.name] = tool
        logger.debug(f"Registered tool: {tool.name}")

    def unregister(self, name: str):
        """Unregister a tool"""
        if name in self._tools:
            del self._tools[name]

    def get(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        """List all registered tool names"""
        return list(self._tools.keys())

    def get_definitions(self) -> List[ToolDefinition]:
        """Get definitions for all tools"""
        return [tool.get_definition() for tool in self._tools.values()]

    async def execute(self, name: str, **kwargs) -> ToolResult:
        """Execute a tool by name"""
        tool = self.get(name)
        if not tool:
            return ToolResult(
                success=False,
                result=None,
                error=f"Tool not found: {name}"
            )

        # Validate arguments
        error = tool.validate_args(**kwargs)
        if error:
            return ToolResult(
                success=False,
                result=None,
                error=error
            )

        try:
            return await tool.execute(**kwargs)
        except Exception as e:
            logger.error(f"Tool execution error ({name}): {e}")
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


def create_tool_registry(project_path: Optional[str] = None) -> ToolRegistry:
    """Create a tool registry with all available tools"""
    from app.services.tools.file_tools import (
        ReadFileTool,
        WriteFileTool,
        EditFileTool,
        ListDirectoryTool,
        SearchFilesTool
    )
    from app.services.tools.execute_tools import ExecuteCommandTool
    from app.services.tools.search_tools import SearchCodeTool, GrepTool

    registry = ToolRegistry()

    # File tools
    registry.register(ReadFileTool(project_path))
    registry.register(WriteFileTool(project_path))
    registry.register(EditFileTool(project_path))
    registry.register(ListDirectoryTool(project_path))
    registry.register(SearchFilesTool(project_path))

    # Execute tools
    registry.register(ExecuteCommandTool(project_path))

    # Search tools
    registry.register(SearchCodeTool(project_path))
    registry.register(GrepTool(project_path))

    return registry

"""
Plugin Base Classes - Foundation for creating plugins
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PluginHook(str, Enum):
    """Available plugin hooks"""
    # Lifecycle hooks
    ON_STARTUP = "on_startup"
    ON_SHUTDOWN = "on_shutdown"

    # Chat hooks
    BEFORE_CHAT = "before_chat"
    AFTER_CHAT = "after_chat"
    ON_MESSAGE = "on_message"

    # Code hooks
    BEFORE_CODE_EXECUTE = "before_code_execute"
    AFTER_CODE_EXECUTE = "after_code_execute"
    ON_CODE_GENERATE = "on_code_generate"

    # File hooks
    BEFORE_FILE_WRITE = "before_file_write"
    AFTER_FILE_WRITE = "after_file_write"
    ON_FILE_CHANGE = "on_file_change"

    # Project hooks
    ON_PROJECT_CREATE = "on_project_create"
    ON_PROJECT_DELETE = "on_project_delete"
    ON_PROJECT_OPEN = "on_project_open"

    # AI hooks
    BEFORE_AI_REQUEST = "before_ai_request"
    AFTER_AI_RESPONSE = "after_ai_response"
    ON_TOOL_CALL = "on_tool_call"


@dataclass
class PluginInfo:
    """Plugin metadata"""
    id: str
    name: str
    version: str
    description: str
    author: str = ""
    homepage: str = ""
    dependencies: List[str] = field(default_factory=list)
    settings_schema: Optional[Dict[str, Any]] = None


class Plugin(ABC):
    """
    Base class for all plugins.

    Example usage:
    ```python
    class MyPlugin(Plugin):
        def get_info(self) -> PluginInfo:
            return PluginInfo(
                id="my-plugin",
                name="My Plugin",
                version="1.0.0",
                description="Does something cool"
            )

        async def on_enable(self):
            print("Plugin enabled!")

        def get_hooks(self) -> Dict[PluginHook, Callable]:
            return {
                PluginHook.ON_MESSAGE: self.handle_message,
                PluginHook.AFTER_CHAT: self.after_chat
            }

        async def handle_message(self, context: Dict[str, Any]) -> Dict[str, Any]:
            # Modify or inspect messages
            return context

        async def after_chat(self, context: Dict[str, Any]) -> Dict[str, Any]:
            # Post-process chat responses
            return context
    ```
    """

    def __init__(self):
        self._enabled = False
        self._settings: Dict[str, Any] = {}

    @abstractmethod
    def get_info(self) -> PluginInfo:
        """Return plugin metadata"""
        pass

    @property
    def info(self) -> PluginInfo:
        """Get plugin info"""
        return self.get_info()

    @property
    def id(self) -> str:
        """Get plugin ID"""
        return self.info.id

    @property
    def enabled(self) -> bool:
        """Check if plugin is enabled"""
        return self._enabled

    @property
    def settings(self) -> Dict[str, Any]:
        """Get plugin settings"""
        return self._settings

    def configure(self, settings: Dict[str, Any]):
        """Configure plugin with settings"""
        self._settings = settings
        self.on_configure(settings)

    def on_configure(self, settings: Dict[str, Any]):
        """Called when plugin settings are updated. Override to handle."""
        pass

    async def on_enable(self):
        """Called when plugin is enabled. Override for initialization."""
        pass

    async def on_disable(self):
        """Called when plugin is disabled. Override for cleanup."""
        pass

    def get_hooks(self) -> Dict[PluginHook, Callable]:
        """
        Return dictionary of hooks this plugin wants to handle.
        Override this method to register your hooks.
        """
        return {}

    def get_tools(self) -> List[Dict[str, Any]]:
        """
        Return list of tools this plugin provides.
        Each tool should be a dict with:
        - name: str
        - description: str
        - parameters: dict (JSON schema)
        - handler: Callable
        """
        return []

    def get_commands(self) -> List[Dict[str, Any]]:
        """
        Return list of CLI commands this plugin provides.
        Each command should be a dict with:
        - name: str
        - description: str
        - handler: Callable
        """
        return []


class ToolPlugin(Plugin):
    """
    Base class for plugins that provide additional tools.

    Example:
    ```python
    class DatabasePlugin(ToolPlugin):
        def get_info(self) -> PluginInfo:
            return PluginInfo(
                id="database-tools",
                name="Database Tools",
                version="1.0.0",
                description="SQL query and database management tools"
            )

        def get_tools(self) -> List[Dict[str, Any]]:
            return [
                {
                    "name": "sql_query",
                    "description": "Execute SQL query",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "database": {"type": "string"}
                        }
                    },
                    "handler": self.execute_query
                }
            ]

        async def execute_query(self, query: str, database: str) -> str:
            # Execute SQL query
            pass
    ```
    """

    @abstractmethod
    def get_tools(self) -> List[Dict[str, Any]]:
        """Return list of tools this plugin provides"""
        pass


class ProviderPlugin(Plugin):
    """
    Base class for plugins that provide AI providers.

    Example:
    ```python
    class CustomLLMPlugin(ProviderPlugin):
        def get_info(self) -> PluginInfo:
            return PluginInfo(
                id="custom-llm",
                name="Custom LLM Provider",
                version="1.0.0",
                description="Integration with Custom LLM"
            )

        def get_provider(self):
            return CustomLLMProvider(self.settings)
    ```
    """

    @abstractmethod
    def get_provider(self):
        """Return the AI provider instance"""
        pass

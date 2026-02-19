"""
Plugin Manager - Load, manage, and coordinate plugins
"""

import importlib
import importlib.util
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable, Type
import asyncio

from app.services.plugins.base import Plugin, PluginInfo, PluginHook

logger = logging.getLogger(__name__)


class PluginManager:
    """
    Manages plugin lifecycle and coordination.

    Responsibilities:
    - Load plugins from files or packages
    - Enable/disable plugins
    - Route hook calls to registered plugins
    - Manage plugin settings
    """

    def __init__(self):
        self._plugins: Dict[str, Plugin] = {}
        self._hooks: Dict[PluginHook, List[Plugin]] = {hook: [] for hook in PluginHook}
        self._tools: Dict[str, Dict[str, Any]] = {}
        self._plugin_paths: List[Path] = []

    def add_plugin_path(self, path: str):
        """Add a directory to search for plugins"""
        path_obj = Path(path)
        if path_obj.exists() and path_obj.is_dir():
            self._plugin_paths.append(path_obj)
            logger.info(f"Added plugin path: {path}")

    def register(self, plugin: Plugin):
        """Register a plugin instance"""
        info = plugin.get_info()
        if info.id in self._plugins:
            logger.warning(f"Plugin {info.id} already registered, skipping")
            return

        self._plugins[info.id] = plugin
        logger.info(f"Registered plugin: {info.name} ({info.id}) v{info.version}")

    def unregister(self, plugin_id: str):
        """Unregister a plugin"""
        if plugin_id not in self._plugins:
            return

        plugin = self._plugins[plugin_id]
        if plugin.enabled:
            asyncio.create_task(self.disable(plugin_id))

        del self._plugins[plugin_id]
        logger.info(f"Unregistered plugin: {plugin_id}")

    def get(self, plugin_id: str) -> Optional[Plugin]:
        """Get plugin by ID"""
        return self._plugins.get(plugin_id)

    def list_plugins(self) -> List[PluginInfo]:
        """List all registered plugins"""
        return [p.get_info() for p in self._plugins.values()]

    def list_enabled(self) -> List[PluginInfo]:
        """List enabled plugins"""
        return [p.get_info() for p in self._plugins.values() if p.enabled]

    async def enable(self, plugin_id: str, settings: Optional[Dict[str, Any]] = None) -> bool:
        """Enable a plugin"""
        plugin = self._plugins.get(plugin_id)
        if not plugin:
            logger.error(f"Plugin not found: {plugin_id}")
            return False

        if plugin.enabled:
            logger.warning(f"Plugin {plugin_id} already enabled")
            return True

        try:
            # Configure plugin
            if settings:
                plugin.configure(settings)

            # Enable plugin
            await plugin.on_enable()
            plugin._enabled = True

            # Register hooks
            for hook, handler in plugin.get_hooks().items():
                self._hooks[hook].append(plugin)

            # Register tools
            for tool in plugin.get_tools():
                tool_name = f"{plugin_id}:{tool['name']}"
                self._tools[tool_name] = {**tool, "plugin_id": plugin_id}

            logger.info(f"Enabled plugin: {plugin_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to enable plugin {plugin_id}: {e}")
            return False

    async def disable(self, plugin_id: str) -> bool:
        """Disable a plugin"""
        plugin = self._plugins.get(plugin_id)
        if not plugin:
            return False

        if not plugin.enabled:
            return True

        try:
            # Disable plugin
            await plugin.on_disable()
            plugin._enabled = False

            # Unregister hooks
            for hook_list in self._hooks.values():
                if plugin in hook_list:
                    hook_list.remove(plugin)

            # Unregister tools
            tools_to_remove = [
                name for name, tool in self._tools.items()
                if tool.get("plugin_id") == plugin_id
            ]
            for name in tools_to_remove:
                del self._tools[name]

            logger.info(f"Disabled plugin: {plugin_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to disable plugin {plugin_id}: {e}")
            return False

    async def trigger_hook(
        self,
        hook: PluginHook,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Trigger a hook and pass context through all registered handlers.

        Args:
            hook: The hook to trigger
            context: Context data to pass to handlers

        Returns:
            Modified context after all handlers have processed it
        """
        handlers = self._hooks.get(hook, [])

        for plugin in handlers:
            if not plugin.enabled:
                continue

            try:
                hook_handlers = plugin.get_hooks()
                handler = hook_handlers.get(hook)

                if handler:
                    if asyncio.iscoroutinefunction(handler):
                        context = await handler(context)
                    else:
                        context = handler(context)

            except Exception as e:
                logger.error(f"Error in plugin {plugin.id} hook {hook}: {e}")
                # Continue with other plugins

        return context

    def get_tool(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get a tool by name"""
        return self._tools.get(tool_name)

    def list_tools(self) -> List[Dict[str, Any]]:
        """List all plugin tools"""
        return [
            {"name": name, **{k: v for k, v in tool.items() if k != "handler"}}
            for name, tool in self._tools.items()
        ]

    async def call_tool(
        self,
        tool_name: str,
        **kwargs
    ) -> Any:
        """Call a plugin tool"""
        tool = self._tools.get(tool_name)
        if not tool:
            raise ValueError(f"Tool not found: {tool_name}")

        handler = tool.get("handler")
        if not handler:
            raise ValueError(f"Tool {tool_name} has no handler")

        plugin = self._plugins.get(tool["plugin_id"])
        if not plugin or not plugin.enabled:
            raise ValueError(f"Plugin for tool {tool_name} is not enabled")

        if asyncio.iscoroutinefunction(handler):
            return await handler(**kwargs)
        return handler(**kwargs)

    def load_plugin_from_file(self, file_path: str) -> Optional[Plugin]:
        """Load a plugin from a Python file"""
        path = Path(file_path)
        if not path.exists() or not path.suffix == ".py":
            logger.error(f"Invalid plugin file: {file_path}")
            return None

        try:
            spec = importlib.util.spec_from_file_location(
                path.stem,
                path
            )
            if not spec or not spec.loader:
                return None

            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Find Plugin subclass in module
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (
                    isinstance(attr, type) and
                    issubclass(attr, Plugin) and
                    attr is not Plugin
                ):
                    plugin = attr()
                    self.register(plugin)
                    return plugin

            logger.warning(f"No Plugin subclass found in {file_path}")
            return None

        except Exception as e:
            logger.error(f"Failed to load plugin from {file_path}: {e}")
            return None

    def discover_plugins(self):
        """Discover and load plugins from all plugin paths"""
        for plugin_path in self._plugin_paths:
            for file_path in plugin_path.glob("*.py"):
                if file_path.name.startswith("_"):
                    continue
                self.load_plugin_from_file(str(file_path))

            # Also check for package plugins
            for dir_path in plugin_path.iterdir():
                if dir_path.is_dir() and (dir_path / "__init__.py").exists():
                    init_file = dir_path / "__init__.py"
                    self.load_plugin_from_file(str(init_file))

    async def startup(self):
        """Called on application startup"""
        await self.trigger_hook(PluginHook.ON_STARTUP, {})

    async def shutdown(self):
        """Called on application shutdown"""
        await self.trigger_hook(PluginHook.ON_SHUTDOWN, {})

        # Disable all plugins
        for plugin_id in list(self._plugins.keys()):
            await self.disable(plugin_id)


# Global plugin manager instance
plugin_manager = PluginManager()

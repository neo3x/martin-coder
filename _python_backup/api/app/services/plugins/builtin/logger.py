"""
Logger Plugin - Logs all plugin hooks for debugging
"""

import logging
from typing import Dict, Any, Callable
from datetime import datetime

from app.services.plugins.base import Plugin, PluginInfo, PluginHook

logger = logging.getLogger(__name__)


class LoggerPlugin(Plugin):
    """
    Debug plugin that logs all hook events.
    Useful for development and debugging plugin interactions.
    """

    def get_info(self) -> PluginInfo:
        return PluginInfo(
            id="builtin-logger",
            name="Debug Logger",
            version="1.0.0",
            description="Logs all plugin hook events for debugging",
            author="Martin-Coder Team",
            settings_schema={
                "type": "object",
                "properties": {
                    "log_level": {
                        "type": "string",
                        "enum": ["DEBUG", "INFO", "WARNING"],
                        "default": "DEBUG"
                    },
                    "include_context": {
                        "type": "boolean",
                        "default": False,
                        "description": "Whether to log full context data"
                    }
                }
            }
        )

    async def on_enable(self):
        logger.info("Logger plugin enabled - will log all hook events")

    async def on_disable(self):
        logger.info("Logger plugin disabled")

    def get_hooks(self) -> Dict[PluginHook, Callable]:
        return {
            PluginHook.ON_MESSAGE: self._log_hook,
            PluginHook.BEFORE_CHAT: self._log_hook,
            PluginHook.AFTER_CHAT: self._log_hook,
            PluginHook.BEFORE_CODE_EXECUTE: self._log_hook,
            PluginHook.AFTER_CODE_EXECUTE: self._log_hook,
            PluginHook.ON_FILE_CHANGE: self._log_hook,
            PluginHook.ON_PROJECT_CREATE: self._log_hook,
            PluginHook.ON_TOOL_CALL: self._log_hook,
        }

    async def _log_hook(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Log hook event"""
        hook_name = context.get("_hook_name", "unknown")
        timestamp = datetime.utcnow().isoformat()

        log_level = self.settings.get("log_level", "DEBUG")
        include_context = self.settings.get("include_context", False)

        message = f"[{timestamp}] Hook triggered: {hook_name}"

        if include_context:
            # Filter out sensitive data
            safe_context = {
                k: v for k, v in context.items()
                if not k.startswith("_") and k not in ["password", "token", "api_key"]
            }
            message += f" | Context: {safe_context}"

        if log_level == "DEBUG":
            logger.debug(message)
        elif log_level == "INFO":
            logger.info(message)
        else:
            logger.warning(message)

        return context

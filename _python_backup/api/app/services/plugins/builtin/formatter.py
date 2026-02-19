"""
Code Formatter Plugin - Auto-format code before writing
"""

import logging
import subprocess
import shutil
from typing import Dict, Any, Callable, List, Optional
from pathlib import Path

from app.services.plugins.base import Plugin, PluginInfo, PluginHook

logger = logging.getLogger(__name__)


class CodeFormatterPlugin(Plugin):
    """
    Automatically formats code before writing to files.
    Supports multiple formatters: black, prettier, rustfmt, etc.
    """

    FORMATTERS = {
        ".py": {"cmd": "black", "args": ["-q", "-"]},
        ".js": {"cmd": "prettier", "args": ["--parser", "babel"]},
        ".ts": {"cmd": "prettier", "args": ["--parser", "typescript"]},
        ".jsx": {"cmd": "prettier", "args": ["--parser", "babel"]},
        ".tsx": {"cmd": "prettier", "args": ["--parser", "typescript"]},
        ".json": {"cmd": "prettier", "args": ["--parser", "json"]},
        ".md": {"cmd": "prettier", "args": ["--parser", "markdown"]},
        ".css": {"cmd": "prettier", "args": ["--parser", "css"]},
        ".scss": {"cmd": "prettier", "args": ["--parser", "scss"]},
        ".html": {"cmd": "prettier", "args": ["--parser", "html"]},
        ".rs": {"cmd": "rustfmt", "args": []},
        ".go": {"cmd": "gofmt", "args": []},
    }

    def __init__(self):
        super().__init__()
        self._available_formatters: Dict[str, bool] = {}

    def get_info(self) -> PluginInfo:
        return PluginInfo(
            id="builtin-formatter",
            name="Code Formatter",
            version="1.0.0",
            description="Auto-format code before writing to files",
            author="Martin-Coder Team",
            settings_schema={
                "type": "object",
                "properties": {
                    "enabled_extensions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "default": [".py", ".js", ".ts", ".json"],
                        "description": "File extensions to format"
                    },
                    "format_on_write": {
                        "type": "boolean",
                        "default": True,
                        "description": "Automatically format on file write"
                    }
                }
            }
        )

    async def on_enable(self):
        """Check which formatters are available"""
        self._check_available_formatters()
        available = [cmd for cmd, avail in self._available_formatters.items() if avail]
        logger.info(f"Code formatter enabled. Available formatters: {available}")

    def _check_available_formatters(self):
        """Check which formatters are installed"""
        checked_cmds = set()
        for ext, config in self.FORMATTERS.items():
            cmd = config["cmd"]
            if cmd in checked_cmds:
                continue
            checked_cmds.add(cmd)
            self._available_formatters[cmd] = shutil.which(cmd) is not None

    def get_hooks(self) -> Dict[PluginHook, Callable]:
        return {
            PluginHook.BEFORE_FILE_WRITE: self._format_before_write,
        }

    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "format_code",
                "description": "Format code using appropriate formatter",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Code to format"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language (python, javascript, etc.)"
                        }
                    },
                    "required": ["code", "language"]
                },
                "handler": self.format_code
            },
            {
                "name": "list_formatters",
                "description": "List available code formatters",
                "parameters": {
                    "type": "object",
                    "properties": {}
                },
                "handler": self.list_formatters
            }
        ]

    async def _format_before_write(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Format code before writing to file"""
        if not self.settings.get("format_on_write", True):
            return context

        file_path = context.get("path", "")
        content = context.get("content", "")

        if not file_path or not content:
            return context

        ext = Path(file_path).suffix
        enabled_extensions = self.settings.get(
            "enabled_extensions",
            [".py", ".js", ".ts", ".json"]
        )

        if ext not in enabled_extensions:
            return context

        formatted = self._format_by_extension(content, ext)
        if formatted:
            context["content"] = formatted

        return context

    def _format_by_extension(self, code: str, extension: str) -> Optional[str]:
        """Format code based on file extension"""
        config = self.FORMATTERS.get(extension)
        if not config:
            return None

        cmd = config["cmd"]
        if not self._available_formatters.get(cmd, False):
            return None

        try:
            args = [cmd] + config["args"]
            result = subprocess.run(
                args,
                input=code,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                return result.stdout
            else:
                logger.warning(f"Formatter {cmd} failed: {result.stderr}")
                return None

        except subprocess.TimeoutExpired:
            logger.warning(f"Formatter {cmd} timed out")
            return None
        except Exception as e:
            logger.error(f"Error running formatter {cmd}: {e}")
            return None

    def format_code(self, code: str, language: str) -> Dict[str, Any]:
        """Format code for a specific language"""
        extension_map = {
            "python": ".py",
            "javascript": ".js",
            "typescript": ".ts",
            "json": ".json",
            "markdown": ".md",
            "css": ".css",
            "html": ".html",
            "rust": ".rs",
            "go": ".go",
        }

        ext = extension_map.get(language.lower())
        if not ext:
            return {
                "success": False,
                "error": f"Unknown language: {language}",
                "formatted_code": code
            }

        formatted = self._format_by_extension(code, ext)
        if formatted:
            return {
                "success": True,
                "formatted_code": formatted
            }

        return {
            "success": False,
            "error": "Formatter not available or failed",
            "formatted_code": code
        }

    def list_formatters(self) -> Dict[str, Any]:
        """List available formatters"""
        return {
            "formatters": {
                cmd: {
                    "available": avail,
                    "extensions": [
                        ext for ext, config in self.FORMATTERS.items()
                        if config["cmd"] == cmd
                    ]
                }
                for cmd, avail in self._available_formatters.items()
            }
        }

"""
Built-in Plugins - Example plugins that ship with Martin-Coder
"""

from app.services.plugins.builtin.logger import LoggerPlugin
from app.services.plugins.builtin.metrics import MetricsPlugin
from app.services.plugins.builtin.formatter import CodeFormatterPlugin

BUILTIN_PLUGINS = [
    LoggerPlugin(),
    MetricsPlugin(),
    CodeFormatterPlugin(),
]

__all__ = ["BUILTIN_PLUGINS", "LoggerPlugin", "MetricsPlugin", "CodeFormatterPlugin"]

"""
Plugins System - Extensibility framework for Martin-Coder
"""

from app.services.plugins.base import Plugin, PluginInfo, PluginHook
from app.services.plugins.manager import PluginManager, plugin_manager

__all__ = ["Plugin", "PluginInfo", "PluginHook", "PluginManager", "plugin_manager"]

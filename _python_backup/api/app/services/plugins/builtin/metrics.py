"""
Metrics Plugin - Collect usage metrics and statistics
"""

import logging
from typing import Dict, Any, Callable, List
from datetime import datetime
from collections import defaultdict

from app.services.plugins.base import Plugin, PluginInfo, PluginHook

logger = logging.getLogger(__name__)


class MetricsPlugin(Plugin):
    """
    Collects usage metrics for analytics and monitoring.
    Tracks chat sessions, code executions, file operations, etc.
    """

    def __init__(self):
        super().__init__()
        self._metrics: Dict[str, int] = defaultdict(int)
        self._timings: Dict[str, List[float]] = defaultdict(list)
        self._session_start: datetime = datetime.utcnow()

    def get_info(self) -> PluginInfo:
        return PluginInfo(
            id="builtin-metrics",
            name="Usage Metrics",
            version="1.0.0",
            description="Collects usage metrics and statistics",
            author="Martin-Coder Team",
            settings_schema={
                "type": "object",
                "properties": {
                    "track_timings": {
                        "type": "boolean",
                        "default": True,
                        "description": "Track operation timings"
                    },
                    "max_timing_samples": {
                        "type": "integer",
                        "default": 1000,
                        "description": "Maximum timing samples to keep"
                    }
                }
            }
        )

    async def on_enable(self):
        self._session_start = datetime.utcnow()
        self._metrics.clear()
        self._timings.clear()
        logger.info("Metrics plugin enabled")

    async def on_disable(self):
        logger.info(f"Metrics summary: {dict(self._metrics)}")

    def get_hooks(self) -> Dict[PluginHook, Callable]:
        return {
            PluginHook.ON_MESSAGE: self._track_message,
            PluginHook.AFTER_CHAT: self._track_chat,
            PluginHook.AFTER_CODE_EXECUTE: self._track_code_execution,
            PluginHook.AFTER_FILE_WRITE: self._track_file_write,
            PluginHook.ON_PROJECT_CREATE: self._track_project_create,
            PluginHook.ON_TOOL_CALL: self._track_tool_call,
        }

    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "get_metrics",
                "description": "Get current usage metrics",
                "parameters": {
                    "type": "object",
                    "properties": {}
                },
                "handler": self.get_metrics
            },
            {
                "name": "get_timings",
                "description": "Get operation timing statistics",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "description": "Operation name to get timings for"
                        }
                    }
                },
                "handler": self.get_timing_stats
            }
        ]

    async def _track_message(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self._metrics["messages_total"] += 1

        role = context.get("role", "unknown")
        self._metrics[f"messages_{role}"] += 1

        return context

    async def _track_chat(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self._metrics["chat_sessions"] += 1

        # Track response time if available
        if "response_time_ms" in context:
            self._add_timing("chat_response", context["response_time_ms"])

        return context

    async def _track_code_execution(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self._metrics["code_executions"] += 1

        exit_code = context.get("exit_code", 0)
        if exit_code == 0:
            self._metrics["code_executions_success"] += 1
        else:
            self._metrics["code_executions_failed"] += 1

        if "execution_time_ms" in context:
            self._add_timing("code_execution", context["execution_time_ms"])

        return context

    async def _track_file_write(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self._metrics["files_written"] += 1

        file_path = context.get("path", "")
        if file_path:
            # Track by extension
            ext = file_path.rsplit(".", 1)[-1] if "." in file_path else "no_ext"
            self._metrics[f"files_written_{ext}"] += 1

        return context

    async def _track_project_create(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self._metrics["projects_created"] += 1
        return context

    async def _track_tool_call(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self._metrics["tool_calls_total"] += 1

        tool_name = context.get("tool_name", "unknown")
        self._metrics[f"tool_calls_{tool_name}"] += 1

        return context

    def _add_timing(self, operation: str, time_ms: float):
        """Add a timing sample"""
        max_samples = self.settings.get("max_timing_samples", 1000)
        timings = self._timings[operation]

        timings.append(time_ms)

        # Keep only recent samples
        if len(timings) > max_samples:
            self._timings[operation] = timings[-max_samples:]

    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics"""
        uptime = (datetime.utcnow() - self._session_start).total_seconds()

        return {
            "counters": dict(self._metrics),
            "uptime_seconds": uptime,
            "session_start": self._session_start.isoformat()
        }

    def get_timing_stats(self, operation: str = None) -> Dict[str, Any]:
        """Get timing statistics"""
        if operation:
            timings = self._timings.get(operation, [])
            return self._calculate_stats(operation, timings)

        return {
            op: self._calculate_stats(op, times)
            for op, times in self._timings.items()
        }

    def _calculate_stats(self, operation: str, timings: List[float]) -> Dict[str, Any]:
        """Calculate statistics for a set of timings"""
        if not timings:
            return {"operation": operation, "samples": 0}

        sorted_timings = sorted(timings)
        count = len(sorted_timings)

        return {
            "operation": operation,
            "samples": count,
            "min_ms": sorted_timings[0],
            "max_ms": sorted_timings[-1],
            "avg_ms": sum(sorted_timings) / count,
            "median_ms": sorted_timings[count // 2],
            "p95_ms": sorted_timings[int(count * 0.95)] if count > 20 else None,
            "p99_ms": sorted_timings[int(count * 0.99)] if count > 100 else None
        }

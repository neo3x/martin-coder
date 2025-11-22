"""
File Watcher Service - Monitor file changes in projects
"""

import asyncio
import logging
from pathlib import Path
from typing import Callable, Dict, Set, Optional, List
from dataclasses import dataclass
from enum import Enum
from watchdog.observers import Observer
from watchdog.events import (
    FileSystemEventHandler,
    FileCreatedEvent,
    FileModifiedEvent,
    FileDeletedEvent,
    FileMovedEvent,
    DirCreatedEvent,
    DirDeletedEvent,
    DirMovedEvent
)

logger = logging.getLogger(__name__)


class FileChangeType(str, Enum):
    """Type of file change"""
    CREATED = "created"
    MODIFIED = "modified"
    DELETED = "deleted"
    MOVED = "moved"


@dataclass
class FileChange:
    """Represents a file change event"""
    path: str
    change_type: FileChangeType
    is_directory: bool
    old_path: Optional[str] = None  # For moved files


class ProjectFileHandler(FileSystemEventHandler):
    """Handler for file system events"""

    IGNORE_PATTERNS = {
        ".git", "__pycache__", "node_modules", ".venv", "venv",
        ".idea", ".vscode", "dist", "build", ".next", ".cache",
        "*.pyc", "*.pyo", ".DS_Store", "*.swp", "*.swo"
    }

    def __init__(
        self,
        project_id: str,
        callback: Callable[[FileChange], None],
        loop: asyncio.AbstractEventLoop
    ):
        super().__init__()
        self.project_id = project_id
        self.callback = callback
        self.loop = loop
        self._debounce_tasks: Dict[str, asyncio.Task] = {}
        self._debounce_delay = 0.5  # seconds

    def _should_ignore(self, path: str) -> bool:
        """Check if path should be ignored"""
        path_obj = Path(path)
        for pattern in self.IGNORE_PATTERNS:
            if pattern.startswith("*"):
                if path_obj.suffix == pattern[1:]:
                    return True
            elif pattern in path_obj.parts:
                return True
            elif path_obj.name == pattern:
                return True
        return False

    def _emit_change(self, change: FileChange):
        """Emit change with debouncing"""
        if self._should_ignore(change.path):
            return

        # Cancel existing debounce task for this path
        if change.path in self._debounce_tasks:
            self._debounce_tasks[change.path].cancel()

        async def debounced_callback():
            await asyncio.sleep(self._debounce_delay)
            try:
                if asyncio.iscoroutinefunction(self.callback):
                    await self.callback(change)
                else:
                    self.callback(change)
            except Exception as e:
                logger.error(f"Error in file change callback: {e}")
            finally:
                self._debounce_tasks.pop(change.path, None)

        self._debounce_tasks[change.path] = asyncio.run_coroutine_threadsafe(
            debounced_callback(),
            self.loop
        )

    def on_created(self, event):
        if isinstance(event, (FileCreatedEvent, DirCreatedEvent)):
            self._emit_change(FileChange(
                path=event.src_path,
                change_type=FileChangeType.CREATED,
                is_directory=event.is_directory
            ))

    def on_modified(self, event):
        if isinstance(event, FileModifiedEvent):
            self._emit_change(FileChange(
                path=event.src_path,
                change_type=FileChangeType.MODIFIED,
                is_directory=False
            ))

    def on_deleted(self, event):
        if isinstance(event, (FileDeletedEvent, DirDeletedEvent)):
            self._emit_change(FileChange(
                path=event.src_path,
                change_type=FileChangeType.DELETED,
                is_directory=event.is_directory
            ))

    def on_moved(self, event):
        if isinstance(event, (FileMovedEvent, DirMovedEvent)):
            self._emit_change(FileChange(
                path=event.dest_path,
                change_type=FileChangeType.MOVED,
                is_directory=event.is_directory,
                old_path=event.src_path
            ))


class FileWatcherService:
    """Service for watching file changes across projects"""

    def __init__(self):
        self._observers: Dict[str, Observer] = {}
        self._handlers: Dict[str, ProjectFileHandler] = {}
        self._callbacks: Dict[str, List[Callable]] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def _get_loop(self) -> asyncio.AbstractEventLoop:
        """Get or create event loop"""
        if self._loop is None or self._loop.is_closed():
            try:
                self._loop = asyncio.get_running_loop()
            except RuntimeError:
                self._loop = asyncio.new_event_loop()
        return self._loop

    def watch(
        self,
        project_id: str,
        path: str,
        callback: Callable[[FileChange], None]
    ) -> bool:
        """Start watching a project directory"""
        if project_id in self._observers:
            # Add callback to existing watcher
            if project_id not in self._callbacks:
                self._callbacks[project_id] = []
            self._callbacks[project_id].append(callback)
            return True

        path_obj = Path(path)
        if not path_obj.exists() or not path_obj.is_dir():
            logger.error(f"Cannot watch non-existent directory: {path}")
            return False

        try:
            def combined_callback(change: FileChange):
                for cb in self._callbacks.get(project_id, []):
                    try:
                        cb(change)
                    except Exception as e:
                        logger.error(f"Callback error: {e}")

            handler = ProjectFileHandler(
                project_id=project_id,
                callback=combined_callback,
                loop=self._get_loop()
            )

            observer = Observer()
            observer.schedule(handler, str(path_obj), recursive=True)
            observer.start()

            self._observers[project_id] = observer
            self._handlers[project_id] = handler
            self._callbacks[project_id] = [callback]

            logger.info(f"Started watching project {project_id} at {path}")
            return True

        except Exception as e:
            logger.error(f"Failed to start watching {path}: {e}")
            return False

    def unwatch(self, project_id: str) -> bool:
        """Stop watching a project"""
        if project_id not in self._observers:
            return False

        try:
            observer = self._observers.pop(project_id)
            observer.stop()
            observer.join(timeout=5)

            self._handlers.pop(project_id, None)
            self._callbacks.pop(project_id, None)

            logger.info(f"Stopped watching project {project_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to stop watching project {project_id}: {e}")
            return False

    def is_watching(self, project_id: str) -> bool:
        """Check if a project is being watched"""
        return project_id in self._observers

    def get_watched_projects(self) -> List[str]:
        """Get list of watched project IDs"""
        return list(self._observers.keys())

    def stop_all(self):
        """Stop all watchers"""
        for project_id in list(self._observers.keys()):
            self.unwatch(project_id)


# Global file watcher service
file_watcher = FileWatcherService()

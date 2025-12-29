# Changelog

All notable changes to the Martin-Coder project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2025-12-29

### Fixed

#### Security Improvements
- **Path Traversal Protection**: Added `validate_path()` function to `file_tools.py` to prevent path traversal attacks via `..` or symlinks
- **Enhanced Command Blocking**: Added 25+ regex patterns in `execute_tools.py` to block dangerous commands including:
  - System destruction commands (`rm -rf /`, `mkfs`, `dd`)
  - Privilege escalation (`sudo`, `su`)
  - Remote code execution (`curl|bash`, `wget|sh`)
  - System control (`shutdown`, `reboot`, `halt`)
  - Process killing (`kill -9 -1`, `pkill -9`)
  - Network listeners (`nc -e`, `ncat -l`)

#### Code Quality Fixes
- **Deprecated datetime.utcnow()**: Updated all occurrences to use timezone-aware `datetime.now(timezone.utc)` in:
  - `app/core/security.py` - JWT token generation
  - `app/models/user.py` - User model timestamps
  - `app/models/project.py` - Project model timestamps
  - `app/models/chat.py` - Chat model timestamps

- **WebSocket Duplicate Accept**: Fixed duplicate `websocket.accept()` call in `app/api/websocket.py` by adding conditional accept parameter

- **Database Session Type Annotation**: Fixed `get_db()` return type from `AsyncSession` to `AsyncGenerator[AsyncSession, None]` in `app/api/deps.py`

- **ChromaDB Invalid Filter**: Fixed RAG retriever's `$contains` operator (not supported in ChromaDB) in `app/services/rag/retriever.py` - now uses post-filtering for substring matches

- **Temp File Cleanup**: Improved temporary file cleanup in `RunPythonTool` using proper `try/finally` pattern in `execute_tools.py`

- **pytest-asyncio Deprecation**: Removed deprecated manual `event_loop` fixture in `tests/conftest.py` - now uses `asyncio_mode=auto` from pytest.ini

### Changed
- Updated `pytest.ini` configuration for pytest-asyncio 0.23+ compatibility

---

## [1.0.0] - 2025-12-28

### Added
- Initial release of Martin-Coder platform
- Multi-LLM support (Claude, OpenAI, LM Studio, Ollama)
- RAG system with ChromaDB for semantic code search
- Sandboxed code execution in Docker containers
- Modern Web UI with Monaco Editor
- CLI interface for developers
- Git and GitHub integration
- Google Drive integration
- Plugin system with hooks
- Project templates
- OAuth authentication (GitHub, Google)
- Internationalization support (English, Spanish)
- Cross-platform startup scripts (Windows, Linux, Mac)
- Functional demo system

---

## Maintainer / Mantenedor

**Francisco Ortiz** - Dev-ops Marfinex
Email: francisco.ortiz@marfinex.com

---

*Martin-Coder Project - 2025*

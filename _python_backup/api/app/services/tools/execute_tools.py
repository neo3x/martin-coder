"""
Code Execution Tools
"""

import os
import re
import asyncio
import subprocess
from pathlib import Path
from typing import Optional, List
import logging

from app.core.config import settings
from app.services.tools.base import BaseTool, ToolParameter, ToolResult

logger = logging.getLogger(__name__)


class ExecuteCommandTool(BaseTool):
    """Execute shell commands"""

    name = "execute_command"
    description = """Execute a shell command in the project directory.
Use for running scripts, tests, build commands, etc.
Commands are executed in a sandboxed environment when available."""
    parameters = [
        ToolParameter(
            name="command",
            type="string",
            description="The shell command to execute"
        ),
        ToolParameter(
            name="working_dir",
            type="string",
            description="Working directory (relative to project root)",
            required=False,
            default="."
        ),
        ToolParameter(
            name="timeout",
            type="integer",
            description="Timeout in seconds",
            required=False,
            default=60
        ),
        ToolParameter(
            name="env",
            type="object",
            description="Additional environment variables",
            required=False
        )
    ]

    # Commands and patterns that are not allowed
    BLOCKED_PATTERNS: List[str] = [
        r'rm\s+(-[rfRF]+\s+)?/',              # rm -rf / or rm /
        r'rm\s+(-[rfRF]+\s+)?~',              # rm -rf ~ or rm ~
        r'rm\s+(-[rfRF]+\s+)?\*',             # rm -rf * (dangerous in wrong dir)
        r'mkfs',                               # Format filesystems
        r'dd\s+if=',                          # Direct disk writes
        r':\(\)\{.*:\|:.*\};:',               # Fork bomb pattern
        r'chmod\s+-R\s+777\s+/',              # Dangerous permission changes
        r'(curl|wget)\s+.*\|\s*(bash|sh|zsh)', # Remote code execution
        r'>\s*/dev/sd',                        # Write to raw devices
        r'>\s*/dev/null\s*2>&1\s*&',          # Background with hidden output (suspicious)
        r'sudo\s+',                            # Privilege escalation
        r'su\s+',                              # User switching
        r'/etc/passwd',                        # Password file access
        r'/etc/shadow',                        # Shadow file access
        r'ssh-keygen.*-f\s+/',                # SSH key generation in system dirs
        r'crontab',                            # Cron manipulation
        r'shutdown|reboot|halt|poweroff',     # System control
        r'kill\s+-9\s+-1',                    # Kill all processes
        r'pkill\s+-9',                        # Aggressive process killing
        r'nc\s+-[el]',                        # Netcat listeners
        r'ncat\s+-[el]',                      # Ncat listeners
        r'python.*-c.*import\s+os',           # Python OS module in one-liners
        r'base64\s+-d.*\|\s*(bash|sh)',       # Encoded command execution
        r'eval\s*\$\(',                       # Eval with command substitution
    ]

    # Compiled regex patterns for efficiency
    _compiled_patterns = None

    @classmethod
    def _get_compiled_patterns(cls):
        """Get compiled regex patterns (cached)"""
        if cls._compiled_patterns is None:
            cls._compiled_patterns = [
                re.compile(pattern, re.IGNORECASE)
                for pattern in cls.BLOCKED_PATTERNS
            ]
        return cls._compiled_patterns

    def _is_safe_command(self, command: str) -> bool:
        """Check if command is safe to execute using regex patterns"""
        # Normalize whitespace
        normalized = ' '.join(command.split())

        for pattern in self._get_compiled_patterns():
            if pattern.search(normalized):
                logger.warning(f"Blocked dangerous command pattern: {pattern.pattern}")
                return False

        return True

    async def execute(
        self,
        command: str,
        working_dir: str = ".",
        timeout: int = 60,
        env: Optional[dict] = None
    ) -> ToolResult:
        """Execute shell command"""
        # Safety check
        if not self._is_safe_command(command):
            return ToolResult(
                success=False,
                result=None,
                error="Command blocked for safety reasons"
            )

        try:
            # Resolve working directory
            if self.project_path:
                cwd = Path(self.project_path) / working_dir
            else:
                cwd = Path(working_dir)

            if not cwd.exists():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Working directory not found: {working_dir}"
                )

            # Prepare environment
            process_env = os.environ.copy()
            if env:
                process_env.update(env)

            # Apply timeout limit
            timeout = min(timeout, settings.SANDBOX_TIMEOUT)

            # Execute command
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(cwd),
                env=process_env
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Command timed out after {timeout} seconds"
                )

            stdout_str = stdout.decode('utf-8', errors='replace')
            stderr_str = stderr.decode('utf-8', errors='replace')

            # Truncate output if too long
            max_output = 50000
            if len(stdout_str) > max_output:
                stdout_str = stdout_str[:max_output] + "\n... (output truncated)"
            if len(stderr_str) > max_output:
                stderr_str = stderr_str[:max_output] + "\n... (output truncated)"

            return ToolResult(
                success=process.returncode == 0,
                result={
                    "stdout": stdout_str,
                    "stderr": stderr_str,
                    "return_code": process.returncode,
                    "command": command
                },
                error=stderr_str if process.returncode != 0 else None
            )

        except Exception as e:
            logger.error(f"Command execution error: {e}")
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


class RunPythonTool(BaseTool):
    """Run Python code"""

    name = "run_python"
    description = "Execute Python code in an isolated environment."
    parameters = [
        ToolParameter(
            name="code",
            type="string",
            description="Python code to execute"
        ),
        ToolParameter(
            name="timeout",
            type="integer",
            description="Timeout in seconds",
            required=False,
            default=30
        )
    ]

    async def execute(self, code: str, timeout: int = 30) -> ToolResult:
        """Execute Python code"""
        import tempfile

        temp_file = None
        process = None

        try:
            # Create a temporary file
            with tempfile.NamedTemporaryFile(
                mode='w',
                suffix='.py',
                delete=False
            ) as f:
                f.write(code)
                temp_file = f.name

            process = await asyncio.create_subprocess_exec(
                'python3', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_path or '.'
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=min(timeout, settings.SANDBOX_TIMEOUT)
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()  # Ensure process is reaped
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Execution timed out after {timeout} seconds"
                )

            stdout_str = stdout.decode('utf-8', errors='replace')
            stderr_str = stderr.decode('utf-8', errors='replace')

            return ToolResult(
                success=process.returncode == 0,
                result={
                    "stdout": stdout_str,
                    "stderr": stderr_str,
                    "return_code": process.returncode
                },
                error=stderr_str if process.returncode != 0 else None
            )

        except Exception as e:
            # Kill process if it's still running
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                except Exception:
                    pass
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )

        finally:
            # Always clean up temp file if it was created
            if temp_file:
                try:
                    os.unlink(temp_file)
                except OSError:
                    pass  # File may already be deleted or never created


class InstallDependenciesTool(BaseTool):
    """Install project dependencies"""

    name = "install_dependencies"
    description = "Install project dependencies based on detected package manager."
    parameters = [
        ToolParameter(
            name="package_manager",
            type="string",
            description="Package manager to use",
            required=False,
            enum=["pip", "npm", "yarn", "pnpm", "auto"]
        ),
        ToolParameter(
            name="packages",
            type="string",
            description="Specific packages to install (space-separated)",
            required=False
        )
    ]

    async def execute(
        self,
        package_manager: str = "auto",
        packages: Optional[str] = None
    ) -> ToolResult:
        """Install dependencies"""
        try:
            project_path = Path(self.project_path) if self.project_path else Path('.')

            # Auto-detect package manager
            if package_manager == "auto":
                if (project_path / "requirements.txt").exists():
                    package_manager = "pip"
                elif (project_path / "package-lock.json").exists():
                    package_manager = "npm"
                elif (project_path / "yarn.lock").exists():
                    package_manager = "yarn"
                elif (project_path / "pnpm-lock.yaml").exists():
                    package_manager = "pnpm"
                elif (project_path / "package.json").exists():
                    package_manager = "npm"
                else:
                    return ToolResult(
                        success=False,
                        result=None,
                        error="Could not detect package manager"
                    )

            # Build command
            if packages:
                # Install specific packages — sanitize input (SEC-06)
                import shlex
                safe_packages = " ".join(shlex.quote(p) for p in packages.split())
                if package_manager == "pip":
                    command = f"pip install {safe_packages}"
                elif package_manager == "npm":
                    command = f"npm install {safe_packages}"
                elif package_manager == "yarn":
                    command = f"yarn add {safe_packages}"
                elif package_manager == "pnpm":
                    command = f"pnpm add {safe_packages}"
                else:
                    return ToolResult(
                        success=False,
                        result=None,
                        error=f"Unknown package manager: {package_manager}"
                    )
            else:
                # Install all dependencies
                if package_manager == "pip":
                    command = "pip install -r requirements.txt"
                elif package_manager == "npm":
                    command = "npm install"
                elif package_manager == "yarn":
                    command = "yarn install"
                elif package_manager == "pnpm":
                    command = "pnpm install"
                else:
                    return ToolResult(
                        success=False,
                        result=None,
                        error=f"Unknown package manager: {package_manager}"
                    )

            # Execute
            exec_tool = ExecuteCommandTool(self.project_path)
            return await exec_tool.execute(command=command, timeout=300)

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )

"""
Code Execution Tools
"""

import os
import asyncio
import subprocess
from pathlib import Path
from typing import Optional
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

    # Commands that are not allowed
    BLOCKED_COMMANDS = [
        'rm -rf /',
        'rm -rf ~',
        'mkfs',
        'dd if=',
        ':(){:|:&};:',  # Fork bomb
        'chmod -R 777 /',
        'curl | sh',
        'wget | sh',
    ]

    def _is_safe_command(self, command: str) -> bool:
        """Check if command is safe to execute"""
        command_lower = command.lower()
        for blocked in self.BLOCKED_COMMANDS:
            if blocked in command_lower:
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
        try:
            # Create a temporary file
            import tempfile

            with tempfile.NamedTemporaryFile(
                mode='w',
                suffix='.py',
                delete=False
            ) as f:
                f.write(code)
                temp_file = f.name

            try:
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

            finally:
                # Clean up temp file
                os.unlink(temp_file)

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


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
                # Install specific packages
                if package_manager == "pip":
                    command = f"pip install {packages}"
                elif package_manager == "npm":
                    command = f"npm install {packages}"
                elif package_manager == "yarn":
                    command = f"yarn add {packages}"
                elif package_manager == "pnpm":
                    command = f"pnpm add {packages}"
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

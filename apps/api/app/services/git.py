"""
Git Service - Git operations for projects
"""

from typing import Optional, List, Dict, Any
from pathlib import Path
import asyncio
import logging

from git import Repo, GitCommandError
from git.exc import InvalidGitRepositoryError

logger = logging.getLogger(__name__)


class GitService:
    """Service for Git operations"""

    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self._repo: Optional[Repo] = None

    @property
    def repo(self) -> Repo:
        """Get or initialize Git repo"""
        if self._repo is None:
            try:
                self._repo = Repo(self.project_path)
            except InvalidGitRepositoryError:
                self._repo = Repo.init(self.project_path)
        return self._repo

    async def init(self) -> Dict[str, Any]:
        """Initialize a new Git repository"""
        loop = asyncio.get_event_loop()

        def _init():
            repo = Repo.init(self.project_path)
            return {"message": "Repository initialized", "path": str(self.project_path)}

        return await loop.run_in_executor(None, _init)

    async def clone(self, url: str, branch: Optional[str] = None) -> Dict[str, Any]:
        """Clone a repository"""
        loop = asyncio.get_event_loop()

        def _clone():
            kwargs = {}
            if branch:
                kwargs["branch"] = branch

            repo = Repo.clone_from(url, self.project_path, **kwargs)
            return {
                "message": "Repository cloned",
                "url": url,
                "path": str(self.project_path),
                "branch": repo.active_branch.name
            }

        return await loop.run_in_executor(None, _clone)

    async def status(self) -> Dict[str, Any]:
        """Get repository status"""
        loop = asyncio.get_event_loop()

        def _status():
            repo = self.repo

            return {
                "branch": repo.active_branch.name,
                "is_dirty": repo.is_dirty(),
                "untracked_files": repo.untracked_files,
                "modified_files": [item.a_path for item in repo.index.diff(None)],
                "staged_files": [item.a_path for item in repo.index.diff("HEAD")],
                "ahead": len(list(repo.iter_commits(f"origin/{repo.active_branch.name}..HEAD"))) if repo.remotes else 0,
                "behind": len(list(repo.iter_commits(f"HEAD..origin/{repo.active_branch.name}"))) if repo.remotes else 0
            }

        return await loop.run_in_executor(None, _status)

    async def add(self, files: Optional[List[str]] = None) -> Dict[str, Any]:
        """Stage files for commit"""
        loop = asyncio.get_event_loop()

        def _add():
            repo = self.repo
            if files:
                repo.index.add(files)
            else:
                repo.git.add(A=True)

            return {
                "message": "Files staged",
                "files": files or ["all"]
            }

        return await loop.run_in_executor(None, _add)

    async def commit(self, message: str) -> Dict[str, Any]:
        """Create a commit"""
        loop = asyncio.get_event_loop()

        def _commit():
            repo = self.repo
            commit = repo.index.commit(message)

            return {
                "message": "Commit created",
                "sha": commit.hexsha,
                "summary": commit.summary,
                "author": str(commit.author)
            }

        return await loop.run_in_executor(None, _commit)

    async def push(
        self,
        remote: str = "origin",
        branch: Optional[str] = None,
        force: bool = False
    ) -> Dict[str, Any]:
        """Push to remote"""
        loop = asyncio.get_event_loop()

        def _push():
            repo = self.repo
            branch_name = branch or repo.active_branch.name

            push_info = repo.remote(remote).push(
                branch_name,
                force=force
            )

            return {
                "message": "Pushed to remote",
                "remote": remote,
                "branch": branch_name,
                "summary": str(push_info[0].summary) if push_info else None
            }

        return await loop.run_in_executor(None, _push)

    async def pull(
        self,
        remote: str = "origin",
        branch: Optional[str] = None
    ) -> Dict[str, Any]:
        """Pull from remote"""
        loop = asyncio.get_event_loop()

        def _pull():
            repo = self.repo
            branch_name = branch or repo.active_branch.name

            pull_info = repo.remote(remote).pull(branch_name)

            return {
                "message": "Pulled from remote",
                "remote": remote,
                "branch": branch_name
            }

        return await loop.run_in_executor(None, _pull)

    async def fetch(self, remote: str = "origin") -> Dict[str, Any]:
        """Fetch from remote"""
        loop = asyncio.get_event_loop()

        def _fetch():
            repo = self.repo
            fetch_info = repo.remote(remote).fetch()

            return {
                "message": "Fetched from remote",
                "remote": remote,
                "refs": [str(info.ref) for info in fetch_info]
            }

        return await loop.run_in_executor(None, _fetch)

    async def branches(self) -> Dict[str, Any]:
        """List branches"""
        loop = asyncio.get_event_loop()

        def _branches():
            repo = self.repo

            local = [str(b) for b in repo.branches]
            remote = [str(r) for r in repo.remote().refs] if repo.remotes else []

            return {
                "current": repo.active_branch.name,
                "local": local,
                "remote": remote
            }

        return await loop.run_in_executor(None, _branches)

    async def checkout(
        self,
        branch: str,
        create: bool = False
    ) -> Dict[str, Any]:
        """Checkout a branch"""
        loop = asyncio.get_event_loop()

        def _checkout():
            repo = self.repo

            if create:
                new_branch = repo.create_head(branch)
                new_branch.checkout()
            else:
                repo.git.checkout(branch)

            return {
                "message": f"Checked out branch: {branch}",
                "branch": branch,
                "created": create
            }

        return await loop.run_in_executor(None, _checkout)

    async def log(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get commit history"""
        loop = asyncio.get_event_loop()

        def _log():
            repo = self.repo
            commits = []

            for commit in repo.iter_commits(max_count=limit):
                commits.append({
                    "sha": commit.hexsha,
                    "short_sha": commit.hexsha[:7],
                    "message": commit.message.strip(),
                    "author": str(commit.author),
                    "date": commit.committed_datetime.isoformat(),
                    "files_changed": len(commit.stats.files)
                })

            return commits

        return await loop.run_in_executor(None, _log)

    async def diff(
        self,
        staged: bool = False,
        file: Optional[str] = None
    ) -> str:
        """Get diff"""
        loop = asyncio.get_event_loop()

        def _diff():
            repo = self.repo

            if staged:
                diff = repo.git.diff("--cached", file) if file else repo.git.diff("--cached")
            else:
                diff = repo.git.diff(file) if file else repo.git.diff()

            return diff

        return await loop.run_in_executor(None, _diff)

    async def reset(
        self,
        mode: str = "mixed",
        ref: str = "HEAD"
    ) -> Dict[str, Any]:
        """Reset repository"""
        loop = asyncio.get_event_loop()

        def _reset():
            repo = self.repo
            repo.git.reset(f"--{mode}", ref)

            return {
                "message": f"Reset to {ref}",
                "mode": mode
            }

        return await loop.run_in_executor(None, _reset)

    async def stash(self, message: Optional[str] = None) -> Dict[str, Any]:
        """Stash changes"""
        loop = asyncio.get_event_loop()

        def _stash():
            repo = self.repo

            if message:
                repo.git.stash("push", "-m", message)
            else:
                repo.git.stash()

            return {"message": "Changes stashed"}

        return await loop.run_in_executor(None, _stash)

    async def stash_pop(self) -> Dict[str, Any]:
        """Pop stashed changes"""
        loop = asyncio.get_event_loop()

        def _pop():
            repo = self.repo
            repo.git.stash("pop")
            return {"message": "Stash popped"}

        return await loop.run_in_executor(None, _pop)

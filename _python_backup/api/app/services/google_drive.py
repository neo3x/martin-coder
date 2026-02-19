"""
Google Drive Service - Sync projects with Google Drive
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import httpx
import logging
import json
import os
from pathlib import Path
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class DriveFile:
    """Google Drive file information"""
    id: str
    name: str
    mime_type: str
    size: Optional[int] = None
    created_time: Optional[str] = None
    modified_time: Optional[str] = None
    parents: Optional[List[str]] = None
    web_view_link: Optional[str] = None


@dataclass
class DriveFolder:
    """Google Drive folder information"""
    id: str
    name: str
    path: str
    files: List[DriveFile] = None
    subfolders: List["DriveFolder"] = None


class GoogleDriveService:
    """Service for Google Drive operations"""

    SCOPES = [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.readonly"
    ]

    FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://www.googleapis.com/drive/v3"
        self.upload_url = "https://www.googleapis.com/upload/drive/v3"

    def _headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json"
        }

    async def get_user_info(self) -> Dict[str, Any]:
        """Get authenticated user's Drive info"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/about",
                params={"fields": "user,storageQuota"},
                headers=self._headers()
            )
            response.raise_for_status()
            return response.json()

    async def list_files(
        self,
        folder_id: str = "root",
        page_size: int = 100,
        query: Optional[str] = None
    ) -> List[DriveFile]:
        """List files in a folder"""
        q = f"'{folder_id}' in parents and trashed = false"
        if query:
            q += f" and {query}"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/files",
                params={
                    "q": q,
                    "pageSize": page_size,
                    "fields": "files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)"
                },
                headers=self._headers()
            )
            response.raise_for_status()
            data = response.json()

            return [
                DriveFile(
                    id=f["id"],
                    name=f["name"],
                    mime_type=f["mimeType"],
                    size=f.get("size"),
                    created_time=f.get("createdTime"),
                    modified_time=f.get("modifiedTime"),
                    parents=f.get("parents"),
                    web_view_link=f.get("webViewLink")
                )
                for f in data.get("files", [])
            ]

    async def get_file(self, file_id: str) -> DriveFile:
        """Get file metadata"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/files/{file_id}",
                params={
                    "fields": "id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink"
                },
                headers=self._headers()
            )
            response.raise_for_status()
            f = response.json()

            return DriveFile(
                id=f["id"],
                name=f["name"],
                mime_type=f["mimeType"],
                size=f.get("size"),
                created_time=f.get("createdTime"),
                modified_time=f.get("modifiedTime"),
                parents=f.get("parents"),
                web_view_link=f.get("webViewLink")
            )

    async def download_file(self, file_id: str) -> bytes:
        """Download file content"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/files/{file_id}",
                params={"alt": "media"},
                headers=self._headers()
            )
            response.raise_for_status()
            return response.content

    async def download_file_to_path(self, file_id: str, local_path: str):
        """Download file to local path"""
        content = await self.download_file(file_id)
        path = Path(local_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return str(path)

    async def upload_file(
        self,
        name: str,
        content: bytes,
        mime_type: str = "application/octet-stream",
        parent_id: str = "root"
    ) -> DriveFile:
        """Upload a file to Drive"""
        metadata = {
            "name": name,
            "parents": [parent_id]
        }

        async with httpx.AsyncClient() as client:
            # Multipart upload
            response = await client.post(
                f"{self.upload_url}/files",
                params={"uploadType": "multipart", "fields": "id,name,mimeType,webViewLink"},
                headers={
                    "Authorization": f"Bearer {self.access_token}",
                },
                files={
                    "metadata": ("metadata", json.dumps(metadata), "application/json"),
                    "file": (name, content, mime_type)
                }
            )
            response.raise_for_status()
            f = response.json()

            return DriveFile(
                id=f["id"],
                name=f["name"],
                mime_type=f["mimeType"],
                web_view_link=f.get("webViewLink")
            )

    async def upload_file_from_path(
        self,
        local_path: str,
        parent_id: str = "root",
        name: Optional[str] = None
    ) -> DriveFile:
        """Upload a local file to Drive"""
        path = Path(local_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {local_path}")

        content = path.read_bytes()
        file_name = name or path.name

        # Detect MIME type
        import mimetypes
        mime_type, _ = mimetypes.guess_type(str(path))
        mime_type = mime_type or "application/octet-stream"

        return await self.upload_file(file_name, content, mime_type, parent_id)

    async def create_folder(
        self,
        name: str,
        parent_id: str = "root"
    ) -> DriveFile:
        """Create a folder in Drive"""
        metadata = {
            "name": name,
            "mimeType": self.FOLDER_MIME_TYPE,
            "parents": [parent_id]
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/files",
                headers={
                    **self._headers(),
                    "Content-Type": "application/json"
                },
                json=metadata
            )
            response.raise_for_status()
            f = response.json()

            return DriveFile(
                id=f["id"],
                name=f["name"],
                mime_type=f["mimeType"]
            )

    async def delete_file(self, file_id: str) -> bool:
        """Delete a file or folder"""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/files/{file_id}",
                headers=self._headers()
            )
            return response.status_code == 204

    async def search_files(
        self,
        query: str,
        page_size: int = 50
    ) -> List[DriveFile]:
        """Search files by name"""
        q = f"name contains '{query}' and trashed = false"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/files",
                params={
                    "q": q,
                    "pageSize": page_size,
                    "fields": "files(id,name,mimeType,size,modifiedTime,webViewLink)"
                },
                headers=self._headers()
            )
            response.raise_for_status()
            data = response.json()

            return [
                DriveFile(
                    id=f["id"],
                    name=f["name"],
                    mime_type=f["mimeType"],
                    size=f.get("size"),
                    modified_time=f.get("modifiedTime"),
                    web_view_link=f.get("webViewLink")
                )
                for f in data.get("files", [])
            ]

    async def sync_folder_to_local(
        self,
        folder_id: str,
        local_path: str
    ) -> Dict[str, Any]:
        """Sync a Drive folder to local directory"""
        local_dir = Path(local_path)
        local_dir.mkdir(parents=True, exist_ok=True)

        synced_files = []
        synced_folders = []

        files = await self.list_files(folder_id)

        for file in files:
            file_path = local_dir / file.name

            if file.mime_type == self.FOLDER_MIME_TYPE:
                # Recursively sync subfolder
                result = await self.sync_folder_to_local(
                    file.id,
                    str(file_path)
                )
                synced_folders.append({
                    "name": file.name,
                    "path": str(file_path),
                    **result
                })
            else:
                # Download file
                await self.download_file_to_path(file.id, str(file_path))
                synced_files.append({
                    "name": file.name,
                    "path": str(file_path),
                    "size": file.size
                })

        return {
            "files": synced_files,
            "folders": synced_folders,
            "total_files": len(synced_files) + sum(f.get("total_files", 0) for f in synced_folders)
        }

    async def sync_local_to_folder(
        self,
        local_path: str,
        folder_id: str = "root",
        ignore_patterns: List[str] = None
    ) -> Dict[str, Any]:
        """Sync local directory to Drive folder"""
        import fnmatch

        ignore_patterns = ignore_patterns or [
            ".git", "__pycache__", "node_modules", ".venv", "venv",
            "*.pyc", ".DS_Store", ".env"
        ]

        local_dir = Path(local_path)
        if not local_dir.exists():
            raise FileNotFoundError(f"Directory not found: {local_path}")

        uploaded_files = []
        created_folders = []

        def should_ignore(path: Path) -> bool:
            for pattern in ignore_patterns:
                if fnmatch.fnmatch(path.name, pattern):
                    return True
            return False

        for item in local_dir.iterdir():
            if should_ignore(item):
                continue

            if item.is_dir():
                # Create folder and sync recursively
                folder = await self.create_folder(item.name, folder_id)
                result = await self.sync_local_to_folder(
                    str(item),
                    folder.id,
                    ignore_patterns
                )
                created_folders.append({
                    "name": item.name,
                    "drive_id": folder.id,
                    **result
                })
            else:
                # Upload file
                file = await self.upload_file_from_path(str(item), folder_id)
                uploaded_files.append({
                    "name": item.name,
                    "drive_id": file.id,
                    "web_link": file.web_view_link
                })

        return {
            "files": uploaded_files,
            "folders": created_folders,
            "total_files": len(uploaded_files) + sum(f.get("total_files", 0) for f in created_folders)
        }


class GoogleDriveOAuth:
    """Handle Google Drive OAuth flow"""

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID or ""
        self.client_secret = settings.GOOGLE_CLIENT_SECRET or ""
        self.authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.scopes = GoogleDriveService.SCOPES + ["openid", "email", "profile"]

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Get OAuth authorization URL for Drive access"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.authorize_url}?{query}"

    async def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            response.raise_for_status()
            return response.json()

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token"
                }
            )
            response.raise_for_status()
            return response.json()


# Global OAuth instance
drive_oauth = GoogleDriveOAuth()

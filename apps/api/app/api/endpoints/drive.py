"""
Google Drive Endpoints - Cloud storage integration
"""

import secrets
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.google_drive import GoogleDriveService, drive_oauth, DriveFile

router = APIRouter()

# Store OAuth states (in production, use Redis)
drive_states: dict = {}


class DriveFileResponse(BaseModel):
    """Drive file response"""
    id: str
    name: str
    mime_type: str
    size: Optional[int] = None
    modified_time: Optional[str] = None
    web_view_link: Optional[str] = None
    is_folder: bool = False


class SyncRequest(BaseModel):
    """Request to sync with Drive"""
    folder_id: str = "root"
    local_path: str


class UploadRequest(BaseModel):
    """Request to upload file"""
    local_path: str
    parent_id: str = "root"
    name: Optional[str] = None


@router.get("/status")
async def drive_status(
    current_user: User = Depends(get_current_user)
):
    """Check Google Drive connection status"""
    is_configured = drive_oauth.is_configured
    is_connected = bool(
        current_user.oauth_provider == "google" and
        current_user.oauth_access_token
    )

    return {
        "configured": is_configured,
        "connected": is_connected,
        "user_has_token": bool(current_user.oauth_access_token) if current_user.oauth_provider == "google" else False
    }


@router.get("/authorize")
async def drive_authorize(
    redirect_uri: str = Query(..., description="Redirect URI after auth"),
    current_user: User = Depends(get_current_user)
):
    """Get Google Drive authorization URL"""
    if not drive_oauth.is_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Drive is not configured"
        )

    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    drive_states[state] = {
        "redirect_uri": redirect_uri,
        "user_id": current_user.id
    }

    auth_url = drive_oauth.get_authorization_url(
        redirect_uri=f"{settings.FRONTEND_URL}/api/drive/callback",
        state=state
    )

    return {"authorization_url": auth_url, "state": state}


@router.get("/callback")
async def drive_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Handle Google Drive OAuth callback"""
    # Verify state
    state_data = drive_states.pop(state, None)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state"
        )

    try:
        # Exchange code for tokens
        token_data = await drive_oauth.exchange_code(
            code=code,
            redirect_uri=f"{settings.FRONTEND_URL}/api/drive/callback"
        )

        # Update user tokens (in real app, store separately for Drive)
        from sqlalchemy import select
        result = await db.execute(
            select(User).where(User.id == state_data["user_id"])
        )
        user = result.scalar_one_or_none()

        if user:
            # Store Drive tokens (you might want a separate table for this)
            user.oauth_access_token = token_data.get("access_token")
            if token_data.get("refresh_token"):
                user.oauth_refresh_token = token_data.get("refresh_token")
            await db.commit()

        # Redirect back to frontend
        redirect_uri = state_data["redirect_uri"]
        return RedirectResponse(url=f"{redirect_uri}?drive_connected=true")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/files", response_model=List[DriveFileResponse])
async def list_drive_files(
    folder_id: str = Query("root", description="Folder ID to list"),
    current_user: User = Depends(get_current_user)
):
    """List files in a Drive folder"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        files = await drive.list_files(folder_id)

        return [
            DriveFileResponse(
                id=f.id,
                name=f.name,
                mime_type=f.mime_type,
                size=int(f.size) if f.size else None,
                modified_time=f.modified_time,
                web_view_link=f.web_view_link,
                is_folder=f.mime_type == "application/vnd.google-apps.folder"
            )
            for f in files
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/files/{file_id}")
async def get_drive_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get file details"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        file = await drive.get_file(file_id)

        return DriveFileResponse(
            id=file.id,
            name=file.name,
            mime_type=file.mime_type,
            size=int(file.size) if file.size else None,
            modified_time=file.modified_time,
            web_view_link=file.web_view_link,
            is_folder=file.mime_type == "application/vnd.google-apps.folder"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/files/{file_id}/download")
async def download_drive_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download file content"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        content = await drive.download_file(file_id)
        file_info = await drive.get_file(file_id)

        from fastapi.responses import Response
        return Response(
            content=content,
            media_type=file_info.mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file_info.name}"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/folders")
async def create_drive_folder(
    name: str = Query(..., description="Folder name"),
    parent_id: str = Query("root", description="Parent folder ID"),
    current_user: User = Depends(get_current_user)
):
    """Create a folder in Drive"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        folder = await drive.create_folder(name, parent_id)

        return {
            "id": folder.id,
            "name": folder.name,
            "message": f"Folder '{name}' created successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/files/{file_id}")
async def delete_drive_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a file or folder from Drive"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        success = await drive.delete_file(file_id)

        if success:
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete file"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/search")
async def search_drive_files(
    query: str = Query(..., description="Search query"),
    current_user: User = Depends(get_current_user)
):
    """Search files in Drive"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        files = await drive.search_files(query)

        return [
            DriveFileResponse(
                id=f.id,
                name=f.name,
                mime_type=f.mime_type,
                size=int(f.size) if f.size else None,
                modified_time=f.modified_time,
                web_view_link=f.web_view_link,
                is_folder=f.mime_type == "application/vnd.google-apps.folder"
            )
            for f in files
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/sync/download")
async def sync_from_drive(
    request: SyncRequest,
    current_user: User = Depends(get_current_user)
):
    """Sync a Drive folder to local directory"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        result = await drive.sync_folder_to_local(
            request.folder_id,
            request.local_path
        )

        return {
            "message": "Sync completed",
            "local_path": request.local_path,
            **result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/sync/upload")
async def sync_to_drive(
    request: SyncRequest,
    current_user: User = Depends(get_current_user)
):
    """Sync a local directory to Drive folder"""
    if not current_user.oauth_access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Google Drive"
        )

    try:
        drive = GoogleDriveService(current_user.oauth_access_token)
        result = await drive.sync_local_to_folder(
            request.local_path,
            request.folder_id
        )

        return {
            "message": "Upload completed",
            "drive_folder_id": request.folder_id,
            **result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

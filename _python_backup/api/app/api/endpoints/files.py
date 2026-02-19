"""
File Operation Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.tools import (
    ReadFileTool,
    WriteFileTool,
    EditFileTool,
    ListDirectoryTool,
    SearchFilesTool
)

router = APIRouter()


class ReadFileRequest(BaseModel):
    path: str
    project_path: Optional[str] = None
    start_line: int = 1
    end_line: Optional[int] = None


class WriteFileRequest(BaseModel):
    path: str
    content: str
    project_path: Optional[str] = None


class EditFileRequest(BaseModel):
    path: str
    old_string: str
    new_string: str
    project_path: Optional[str] = None
    replace_all: bool = False


class ListDirectoryRequest(BaseModel):
    path: str = "."
    project_path: Optional[str] = None
    recursive: bool = False
    max_depth: int = 3
    pattern: Optional[str] = None


class SearchFilesRequest(BaseModel):
    pattern: str
    path: str = "."
    project_path: Optional[str] = None
    max_results: int = 100


@router.post("/read")
async def read_file(
    request: ReadFileRequest,
    current_user: User = Depends(get_current_user)
):
    """Read file contents"""
    tool = ReadFileTool(request.project_path)
    result = await tool.execute(
        path=request.path,
        start_line=request.start_line,
        end_line=request.end_line
    )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error
        )

    return result.result


@router.post("/write")
async def write_file(
    request: WriteFileRequest,
    current_user: User = Depends(get_current_user)
):
    """Write content to file"""
    tool = WriteFileTool(request.project_path)
    result = await tool.execute(
        path=request.path,
        content=request.content
    )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error
        )

    return result.result


@router.post("/edit")
async def edit_file(
    request: EditFileRequest,
    current_user: User = Depends(get_current_user)
):
    """Edit file with string replacement"""
    tool = EditFileTool(request.project_path)
    result = await tool.execute(
        path=request.path,
        old_string=request.old_string,
        new_string=request.new_string,
        replace_all=request.replace_all
    )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error
        )

    return result.result


@router.post("/list")
async def list_directory(
    request: ListDirectoryRequest,
    current_user: User = Depends(get_current_user)
):
    """List directory contents"""
    tool = ListDirectoryTool(request.project_path)
    result = await tool.execute(
        path=request.path,
        recursive=request.recursive,
        max_depth=request.max_depth,
        pattern=request.pattern
    )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error
        )

    return result.result


@router.post("/search")
async def search_files(
    request: SearchFilesRequest,
    current_user: User = Depends(get_current_user)
):
    """Search for files by pattern"""
    tool = SearchFilesTool(request.project_path)
    result = await tool.execute(
        pattern=request.pattern,
        path=request.path,
        max_results=request.max_results
    )

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error
        )

    return result.result

"""
Plugins Endpoints - Manage plugins
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user, get_current_superuser
from app.models.user import User
from app.services.plugins import plugin_manager, PluginInfo
from app.services.plugins.builtin import BUILTIN_PLUGINS

router = APIRouter()


class PluginInfoResponse(BaseModel):
    """Plugin information response"""
    id: str
    name: str
    version: str
    description: str
    author: str = ""
    enabled: bool = False


class PluginSettingsRequest(BaseModel):
    """Request to configure plugin"""
    settings: Dict[str, Any]


class ToolInfo(BaseModel):
    """Tool information"""
    name: str
    description: str
    plugin_id: str


class ToolCallRequest(BaseModel):
    """Request to call a plugin tool"""
    tool_name: str
    arguments: Dict[str, Any] = {}


# Register builtin plugins on module load
for plugin in BUILTIN_PLUGINS:
    plugin_manager.register(plugin)


@router.get("", response_model=List[PluginInfoResponse])
async def list_plugins(
    current_user: User = Depends(get_current_user)
):
    """List all available plugins"""
    plugins = []
    for info in plugin_manager.list_plugins():
        plugin = plugin_manager.get(info.id)
        plugins.append(PluginInfoResponse(
            id=info.id,
            name=info.name,
            version=info.version,
            description=info.description,
            author=info.author,
            enabled=plugin.enabled if plugin else False
        ))
    return plugins


@router.get("/enabled", response_model=List[PluginInfoResponse])
async def list_enabled_plugins(
    current_user: User = Depends(get_current_user)
):
    """List enabled plugins"""
    plugins = []
    for info in plugin_manager.list_enabled():
        plugins.append(PluginInfoResponse(
            id=info.id,
            name=info.name,
            version=info.version,
            description=info.description,
            author=info.author,
            enabled=True
        ))
    return plugins


@router.get("/{plugin_id}", response_model=PluginInfoResponse)
async def get_plugin(
    plugin_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get plugin details"""
    plugin = plugin_manager.get(plugin_id)
    if not plugin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin not found: {plugin_id}"
        )

    info = plugin.get_info()
    return PluginInfoResponse(
        id=info.id,
        name=info.name,
        version=info.version,
        description=info.description,
        author=info.author,
        enabled=plugin.enabled
    )


@router.post("/{plugin_id}/enable")
async def enable_plugin(
    plugin_id: str,
    settings: Optional[PluginSettingsRequest] = None,
    current_user: User = Depends(get_current_superuser)
):
    """Enable a plugin (superuser only)"""
    plugin = plugin_manager.get(plugin_id)
    if not plugin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin not found: {plugin_id}"
        )

    plugin_settings = settings.settings if settings else None
    success = await plugin_manager.enable(plugin_id, plugin_settings)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable plugin: {plugin_id}"
        )

    return {"status": "enabled", "plugin_id": plugin_id}


@router.post("/{plugin_id}/disable")
async def disable_plugin(
    plugin_id: str,
    current_user: User = Depends(get_current_superuser)
):
    """Disable a plugin (superuser only)"""
    plugin = plugin_manager.get(plugin_id)
    if not plugin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin not found: {plugin_id}"
        )

    success = await plugin_manager.disable(plugin_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable plugin: {plugin_id}"
        )

    return {"status": "disabled", "plugin_id": plugin_id}


@router.put("/{plugin_id}/settings")
async def configure_plugin(
    plugin_id: str,
    settings: PluginSettingsRequest,
    current_user: User = Depends(get_current_superuser)
):
    """Configure plugin settings (superuser only)"""
    plugin = plugin_manager.get(plugin_id)
    if not plugin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin not found: {plugin_id}"
        )

    plugin.configure(settings.settings)
    return {"status": "configured", "plugin_id": plugin_id}


@router.get("/tools/list", response_model=List[ToolInfo])
async def list_plugin_tools(
    current_user: User = Depends(get_current_user)
):
    """List all available plugin tools"""
    tools = plugin_manager.list_tools()
    return [
        ToolInfo(
            name=tool["name"],
            description=tool.get("description", ""),
            plugin_id=tool.get("plugin_id", "")
        )
        for tool in tools
    ]


@router.post("/tools/call")
async def call_plugin_tool(
    request: ToolCallRequest,
    current_user: User = Depends(get_current_user)
):
    """Call a plugin tool"""
    try:
        result = await plugin_manager.call_tool(
            request.tool_name,
            **request.arguments
        )
        return {"result": result}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tool execution failed: {str(e)}"
        )

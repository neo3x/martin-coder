"""
WebSocket Handler for real-time communication
"""

from typing import Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
import logging
import asyncio

from app.core.security import decode_token

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections"""

    def __init__(self):
        # user_id -> set of connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # chat_id -> set of connections
        self.chat_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, accept: bool = True):
        """Register a connection for a user

        Args:
            websocket: The WebSocket connection
            user_id: The user's ID
            accept: Whether to accept the connection (set to False if already accepted)
        """
        if accept:
            await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

        logger.info(f"User {user_id} connected via WebSocket")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        # Remove from all chat connections
        for chat_id in list(self.chat_connections.keys()):
            self.chat_connections[chat_id].discard(websocket)
            if not self.chat_connections[chat_id]:
                del self.chat_connections[chat_id]

        logger.info(f"User {user_id} disconnected from WebSocket")

    def join_chat(self, websocket: WebSocket, chat_id: str):
        """Join a chat room"""
        if chat_id not in self.chat_connections:
            self.chat_connections[chat_id] = set()
        self.chat_connections[chat_id].add(websocket)

    def leave_chat(self, websocket: WebSocket, chat_id: str):
        """Leave a chat room"""
        if chat_id in self.chat_connections:
            self.chat_connections[chat_id].discard(websocket)

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to all connections of a user"""
        if user_id in self.active_connections:
            dead: list[WebSocket] = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
                    dead.append(connection)
            # Clean up dead connections (RES-06)
            for ws in dead:
                self.disconnect(ws, user_id)

    async def broadcast_to_chat(self, chat_id: str, message: dict):
        """Broadcast message to all connections in a chat"""
        if chat_id in self.chat_connections:
            dead: list[WebSocket] = []
            for connection in self.chat_connections[chat_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to chat {chat_id}: {e}")
                    dead.append(connection)
            # Clean up dead connections (RES-06)
            for ws in dead:
                self.chat_connections[chat_id].discard(ws)


# Global connection manager
manager = ConnectionManager()


def setup_websocket(app: FastAPI):
    """Setup WebSocket routes"""

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """Main WebSocket endpoint"""
        user_id = None

        try:
            # Wait for authentication message
            await websocket.accept()
            auth_message = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=10.0
            )

            if auth_message.get("type") != "auth":
                await websocket.close(code=4001, reason="Authentication required")
                return

            token = auth_message.get("token")
            if not token:
                await websocket.close(code=4001, reason="Token required")
                return

            token_data = decode_token(token)
            if not token_data:
                await websocket.close(code=4001, reason="Invalid token")
                return

            user_id = token_data.user_id

            # Register connection (already accepted, so pass accept=False)
            await manager.connect(websocket, user_id, accept=False)

            # Send confirmation
            await websocket.send_json({
                "type": "connected",
                "user_id": user_id
            })

            # Handle messages
            while True:
                data = await websocket.receive_json()
                await handle_message(websocket, user_id, data)

        except WebSocketDisconnect:
            pass
        except asyncio.TimeoutError:
            await websocket.close(code=4001, reason="Authentication timeout")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            if user_id:
                manager.disconnect(websocket, user_id)


async def handle_message(websocket: WebSocket, user_id: str, data: dict):
    """Handle incoming WebSocket message"""
    msg_type = data.get("type")

    if msg_type == "ping":
        await websocket.send_json({"type": "pong"})

    elif msg_type == "join_chat":
        chat_id = data.get("chat_id")
        if chat_id:
            manager.join_chat(websocket, chat_id)
            await websocket.send_json({
                "type": "joined_chat",
                "chat_id": chat_id
            })

    elif msg_type == "leave_chat":
        chat_id = data.get("chat_id")
        if chat_id:
            manager.leave_chat(websocket, chat_id)
            await websocket.send_json({
                "type": "left_chat",
                "chat_id": chat_id
            })

    else:
        await websocket.send_json({
            "type": "error",
            "message": f"Unknown message type: {msg_type}"
        })

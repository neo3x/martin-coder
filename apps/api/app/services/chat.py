"""
Chat Service - Handle chat completions with tool use
"""

from typing import AsyncGenerator, Optional, Dict, Any, List
import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.chat import Chat, Message, MessageRole
from app.models.project import Project
from app.services.ai.router import ai_router
from app.services.tools.base import create_tool_registry
from app.services.rag.retriever import RAGRetriever
from app.schemas.ai import AIMessage, ToolDefinition

logger = logging.getLogger(__name__)

# System prompt for code assistant
SYSTEM_PROMPT = """You are Martin-Coder, an expert AI coding assistant. You help users with:
- Writing, editing, and debugging code
- Creating project architectures and structures
- Explaining code and concepts
- Reviewing code and suggesting improvements
- Running commands and managing files

You have access to tools for file operations, code execution, and more. Use them when needed.

When working with code:
1. Understand the full context before making changes
2. Write clean, well-documented code
3. Follow best practices for the language/framework
4. Consider security and performance
5. Test your changes when possible

Be concise but thorough. Ask clarifying questions when needed.
"""


class ChatService:
    """Service for managing chat completions"""

    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user

    async def complete(
        self,
        chat: Chat,
        message: str,
        project: Optional[Project] = None,
        use_tools: bool = True
    ) -> Dict[str, Any]:
        """Get a complete (non-streaming) response"""
        # Save user message
        user_message = await self._save_message(
            chat=chat,
            role=MessageRole.USER,
            content=message
        )

        # Get conversation history
        messages = await self._get_conversation_messages(chat)

        # Get RAG context if project exists — with fallback (RES-05)
        context = ""
        if project and project.is_indexed:
            try:
                rag = RAGRetriever(project.id)
                context = await rag.get_context_for_query(message)
            except Exception as e:
                logger.warning("RAG retrieval failed, continuing without context: %s", e)
                context = ""

        # Prepare system prompt
        system_prompt = self._build_system_prompt(project, context)

        # Get tools if enabled
        tools = None
        tool_registry = None
        if use_tools:
            tool_registry = create_tool_registry(
                project.local_path if project else None
            )
            tools = [
                ToolDefinition(**t.model_dump())
                for t in tool_registry.get_definitions()
            ]

        # Call AI
        response = await ai_router.complete(
            messages=[AIMessage(role=m["role"], content=m["content"]) for m in messages],
            provider=chat.ai_provider,
            model=chat.ai_model,
            system_prompt=system_prompt,
            tools=tools
        )

        # Handle tool calls
        if response.tool_calls and tool_registry:
            response = await self._handle_tool_calls(
                chat=chat,
                response=response,
                messages=messages,
                tool_registry=tool_registry,
                system_prompt=system_prompt
            )

        # Save assistant response
        assistant_message = await self._save_message(
            chat=chat,
            role=MessageRole.ASSISTANT,
            content=response.content,
            model=response.model,
            prompt_tokens=response.usage.get("prompt_tokens", 0),
            completion_tokens=response.usage.get("completion_tokens", 0)
        )

        return {
            "message": assistant_message,
            "usage": response.usage
        }

    async def stream_completion(
        self,
        chat: Chat,
        message: str,
        project: Optional[Project] = None,
        use_tools: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream a chat completion"""
        # Save user message
        user_message = await self._save_message(
            chat=chat,
            role=MessageRole.USER,
            content=message
        )

        # Get conversation history
        messages = await self._get_conversation_messages(chat)

        # Get RAG context — with fallback (RES-05)
        context = ""
        if project and project.is_indexed:
            try:
                rag = RAGRetriever(project.id)
                context = await rag.get_context_for_query(message)
            except Exception as e:
                logger.warning("RAG retrieval failed, continuing without context: %s", e)
                context = ""

        # Prepare system prompt
        system_prompt = self._build_system_prompt(project, context)

        # Get tools
        tools = None
        tool_registry = None
        if use_tools:
            tool_registry = create_tool_registry(
                project.local_path if project else None
            )
            tools = [
                ToolDefinition(**t.model_dump())
                for t in tool_registry.get_definitions()
            ]

        # Stream response
        full_content = ""
        current_tool_calls = []

        async for delta in ai_router.stream(
            messages=[AIMessage(role=m["role"], content=m["content"]) for m in messages],
            provider=chat.ai_provider,
            model=chat.ai_model,
            system_prompt=system_prompt,
            tools=tools
        ):
            if delta.type == "text" and delta.text:
                full_content += delta.text
                yield {"type": "content", "content": delta.text}

            elif delta.type == "tool_call_start":
                yield {"type": "tool_call_start", "tool": delta.tool_call}

            elif delta.type == "tool_call_end" and delta.tool_call:
                current_tool_calls.append(delta.tool_call)
                yield {"type": "tool_call_end", "tool": delta.tool_call}

        # Execute tool calls if any
        if current_tool_calls and tool_registry:
            for tc in current_tool_calls:
                try:
                    # Parse arguments
                    args = tc.get("arguments", {})
                    if isinstance(args, str):
                        args = json.loads(args)

                    # Execute tool
                    result = await tool_registry.execute(tc["name"], **args)

                    yield {
                        "type": "tool_result",
                        "tool_call_id": tc["id"],
                        "name": tc["name"],
                        "result": result.result if result.success else None,
                        "error": result.error
                    }

                    # Continue conversation with tool result
                    # (In a full implementation, we'd recursively call the AI)

                except Exception as e:
                    yield {
                        "type": "tool_result",
                        "tool_call_id": tc["id"],
                        "name": tc["name"],
                        "error": str(e)
                    }

        # Save assistant message
        await self._save_message(
            chat=chat,
            role=MessageRole.ASSISTANT,
            content=full_content,
            tool_calls=current_tool_calls if current_tool_calls else None
        )

        yield {"type": "done"}

    async def _save_message(
        self,
        chat: Chat,
        role: MessageRole,
        content: str,
        tool_calls: Optional[List] = None,
        tool_call_id: Optional[str] = None,
        model: Optional[str] = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0
    ) -> Message:
        """Save a message to the database"""
        message = Message(
            chat_id=chat.id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            tool_call_id=tool_call_id,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens
        )

        self.db.add(message)
        chat.message_count += 1
        chat.total_tokens += prompt_tokens + completion_tokens

        await self.db.commit()
        await self.db.refresh(message)

        return message

    async def _get_conversation_messages(self, chat: Chat) -> List[Dict[str, str]]:
        """Get conversation messages for AI context"""
        from sqlalchemy import select

        result = await self.db.execute(
            select(Message)
            .where(Message.chat_id == chat.id)
            .order_by(Message.created_at)
            .limit(50)  # Limit context window
        )
        messages = result.scalars().all()

        return [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages
        ]

    def _build_system_prompt(
        self,
        project: Optional[Project],
        context: str
    ) -> str:
        """Build system prompt with project context"""
        prompt = SYSTEM_PROMPT

        if project:
            prompt += f"\n\nCurrent project: {project.name}"
            if project.detected_language:
                prompt += f"\nMain language: {project.detected_language}"
            if project.detected_framework:
                prompt += f"\nFramework: {project.detected_framework}"
            if project.local_path:
                prompt += f"\nProject path: {project.local_path}"

        if context:
            prompt += f"\n\n## Relevant Code Context\n{context}"

        return prompt

    async def _handle_tool_calls(
        self,
        chat: Chat,
        response,
        messages: List[Dict],
        tool_registry,
        system_prompt: str
    ):
        """Handle tool calls and continue conversation"""
        # Execute each tool call
        tool_results = []

        for tc in response.tool_calls:
            result = await tool_registry.execute(tc.name, **tc.arguments)
            tool_results.append({
                "tool_call_id": tc.id,
                "result": result.result if result.success else f"Error: {result.error}"
            })

        # Add assistant message with tool calls
        messages.append({
            "role": "assistant",
            "content": response.content,
            "tool_calls": [
                {"id": tc.id, "name": tc.name, "arguments": tc.arguments}
                for tc in response.tool_calls
            ]
        })

        # Add tool results
        for tr in tool_results:
            messages.append({
                "role": "tool",
                "content": json.dumps(tr["result"]),
                "tool_call_id": tr["tool_call_id"]
            })

        # Continue conversation
        return await ai_router.complete(
            messages=[AIMessage(**m) for m in messages],
            provider=chat.ai_provider,
            model=chat.ai_model,
            system_prompt=system_prompt
        )

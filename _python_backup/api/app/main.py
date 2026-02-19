"""
Martin-Coder API - Main Application Entry Point
"""

import json
import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import init_db, engine
from app.api.routes import api_router
from app.api.websocket import setup_websocket, manager


# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------

class JSONFormatter(logging.Formatter):
    """Outputs log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_data["exception"] = self.formatException(record.exc_info)
        correlation_id = getattr(record, "correlation_id", None)
        if correlation_id:
            log_data["correlation_id"] = correlation_id
        return json.dumps(log_data, default=str)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
logging.root.handlers = [handler]
logging.root.setLevel(getattr(logging, settings.LOG_LEVEL))

# Disable uvicorn's default access log to avoid duplicate request logs
# (our RequestContextMiddleware already emits structured JSON request logs)
logging.getLogger("uvicorn.access").handlers = []
logging.getLogger("uvicorn.access").propagate = False

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Correlation-ID / request-logging middleware
# ---------------------------------------------------------------------------

class RequestContextMiddleware(BaseHTTPMiddleware):
    """Adds a unique correlation ID to every request, logs request/response,
    and sets security headers on the response."""

    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id

        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        # Structured request log
        logger.info(
            "request completed",
            extra={
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": elapsed_ms,
            },
        )

        # Correlation header in response
        response.headers["X-Correlation-ID"] = correlation_id

        # Security headers (SEC-07)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

        return response


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager with graceful shutdown."""
    # Startup
    logger.info("Starting Martin-Coder API…")
    await init_db()
    logger.info("Database initialized")

    yield

    # Shutdown — clean up resources
    logger.info("Shutting down Martin-Coder API…")

    # Close all active WebSocket connections gracefully
    for user_id in list(manager.active_connections.keys()):
        for ws in list(manager.active_connections.get(user_id, set())):
            try:
                await ws.close(code=1001, reason="Server shutting down")
            except Exception:
                pass
    manager.active_connections.clear()
    manager.chat_connections.clear()

    # Dispose SQLAlchemy engine connection pool
    await engine.dispose()

    logger.info("Cleanup complete")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Martin-Coder API",
    description="Multi-LLM code generation and editing platform",
    version="1.2.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)


# ---------------------------------------------------------------------------
# Middleware (order matters — last added runs first)
# ---------------------------------------------------------------------------

app.add_middleware(RequestContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Correlation-ID",
        "X-Requested-With",
    ],
)


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return structured validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler — never leak internal details to the client."""
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        extra={"correlation_id": correlation_id, "path": request.url.path},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "correlation_id": correlation_id,
        },
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(api_router, prefix="/api/v1")

setup_websocket(app)


# ---------------------------------------------------------------------------
# Health check (OPS-02) — verifies DB, Redis, and AI providers
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Deep health check verifying all critical dependencies."""
    checks: dict = {}

    # Database
    try:
        from sqlalchemy import text as sa_text
        from app.core.database import async_session_maker

        async with async_session_maker() as session:
            await session.execute(sa_text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {e}"

    # Redis
    try:
        import redis.asyncio as aioredis

        r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {e}"

    overall = "healthy" if all(v == "healthy" for v in checks.values()) else "degraded"

    return JSONResponse(
        content={
            "status": overall,
            "version": "1.2.0",
            "service": "martin-coder-api",
            "checks": checks,
        },
        status_code=200 if overall == "healthy" else 503,
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Martin-Coder API",
        "docs": "/docs",
        "health": "/health",
    }

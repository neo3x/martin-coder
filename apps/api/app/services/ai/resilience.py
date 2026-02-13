"""
AI Provider Resilience — retry with exponential backoff and circuit breaker.
RES-02 (timeouts), RES-03 (retry), RES-04 (circuit breaker)
"""

import asyncio
import logging
import time
from functools import wraps
from typing import TypeVar, Callable, Any

logger = logging.getLogger(__name__)

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------

class CircuitBreaker:
    """Simple circuit breaker for AI providers.

    States:
        CLOSED  — requests flow normally.
        OPEN    — all requests are immediately rejected.
        HALF_OPEN — one probe request is allowed to test recovery.
    """

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

        self._state = self.CLOSED
        self._failure_count = 0
        self._last_failure_time: float = 0

    @property
    def state(self) -> str:
        if self._state == self.OPEN:
            if time.monotonic() - self._last_failure_time >= self.recovery_timeout:
                self._state = self.HALF_OPEN
        return self._state

    def record_success(self) -> None:
        self._failure_count = 0
        self._state = self.CLOSED

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self._failure_count >= self.failure_threshold:
            self._state = self.OPEN
            logger.warning(
                "Circuit breaker OPEN for provider %s after %d failures",
                self.name,
                self._failure_count,
            )

    def allow_request(self) -> bool:
        s = self.state
        if s == self.CLOSED:
            return True
        if s == self.HALF_OPEN:
            return True  # allow probe
        return False


# ---------------------------------------------------------------------------
# Retry helper
# ---------------------------------------------------------------------------

async def retry_with_backoff(
    coro_factory: Callable[..., Any],
    *args: Any,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    timeout: float = 120.0,
    circuit_breaker: CircuitBreaker | None = None,
    **kwargs: Any,
) -> Any:
    """Execute an async callable with retry, exponential backoff, timeout,
    and optional circuit-breaker protection.
    """
    if circuit_breaker and not circuit_breaker.allow_request():
        raise RuntimeError(
            f"Circuit breaker OPEN for {circuit_breaker.name}. "
            f"Retry in {circuit_breaker.recovery_timeout}s."
        )

    last_exc: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            result = await asyncio.wait_for(
                coro_factory(*args, **kwargs),
                timeout=timeout,
            )
            if circuit_breaker:
                circuit_breaker.record_success()
            return result

        except asyncio.TimeoutError:
            last_exc = TimeoutError(
                f"AI request timed out after {timeout}s (attempt {attempt}/{max_attempts})"
            )
            logger.warning("AI request timeout (attempt %d/%d)", attempt, max_attempts)

        except Exception as e:
            last_exc = e
            logger.warning(
                "AI request failed (attempt %d/%d): %s", attempt, max_attempts, e
            )

        if circuit_breaker:
            circuit_breaker.record_failure()

        if attempt < max_attempts:
            delay = base_delay * (2 ** (attempt - 1))
            await asyncio.sleep(delay)

    raise last_exc  # type: ignore[misc]

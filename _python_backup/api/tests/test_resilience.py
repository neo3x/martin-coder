"""
TEST-02: AI provider resilience tests (circuit breaker, retry)
"""

import pytest
import asyncio
from app.services.ai.resilience import CircuitBreaker, retry_with_backoff


class TestCircuitBreaker:
    """Tests for the circuit breaker"""

    def test_initial_state_closed(self):
        cb = CircuitBreaker("test", failure_threshold=3)
        assert cb.state == CircuitBreaker.CLOSED
        assert cb.allow_request() is True

    def test_opens_after_threshold(self):
        cb = CircuitBreaker("test", failure_threshold=3)
        for _ in range(3):
            cb.record_failure()
        assert cb.state == CircuitBreaker.OPEN
        assert cb.allow_request() is False

    def test_success_resets_count(self):
        cb = CircuitBreaker("test", failure_threshold=3)
        cb.record_failure()
        cb.record_failure()
        cb.record_success()
        assert cb.state == CircuitBreaker.CLOSED
        assert cb._failure_count == 0

    def test_half_open_after_recovery(self):
        cb = CircuitBreaker("test", failure_threshold=2, recovery_timeout=0.01)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitBreaker.OPEN
        # Wait for recovery timeout
        import time
        time.sleep(0.02)
        assert cb.state == CircuitBreaker.HALF_OPEN
        assert cb.allow_request() is True


class TestRetryWithBackoff:
    """Tests for retry logic"""

    @pytest.mark.asyncio
    async def test_success_on_first_try(self):
        call_count = 0

        async def succeeding_fn():
            nonlocal call_count
            call_count += 1
            return "ok"

        result = await retry_with_backoff(succeeding_fn, max_attempts=3, timeout=5.0)
        assert result == "ok"
        assert call_count == 1

    @pytest.mark.asyncio
    async def test_retries_on_failure_then_succeeds(self):
        call_count = 0

        async def flaky_fn():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("temporary error")
            return "recovered"

        result = await retry_with_backoff(
            flaky_fn, max_attempts=3, base_delay=0.01, timeout=5.0
        )
        assert result == "recovered"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_raises_after_max_attempts(self):
        async def always_fails():
            raise ValueError("permanent error")

        with pytest.raises(ValueError, match="permanent error"):
            await retry_with_backoff(
                always_fails, max_attempts=2, base_delay=0.01, timeout=5.0
            )

    @pytest.mark.asyncio
    async def test_timeout_raises(self):
        async def slow_fn():
            await asyncio.sleep(10)

        with pytest.raises(TimeoutError):
            await retry_with_backoff(
                slow_fn, max_attempts=1, timeout=0.05
            )

    @pytest.mark.asyncio
    async def test_circuit_breaker_rejects_when_open(self):
        cb = CircuitBreaker("test", failure_threshold=1)
        cb.record_failure()  # opens immediately

        async def fn():
            return "ok"

        with pytest.raises(RuntimeError, match="Circuit breaker OPEN"):
            await retry_with_backoff(fn, circuit_breaker=cb, max_attempts=1, timeout=5.0)

"""
Encryption utilities for sensitive data at rest (API keys, tokens).
Uses Fernet symmetric encryption derived from the application SECRET_KEY.
"""

import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken


def _derive_key(secret: str) -> bytes:
    """Derive a 32-byte Fernet key from an arbitrary secret string."""
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_value(value: str, secret: str) -> str:
    """Encrypt a plaintext value. Returns a URL-safe base64-encoded token."""
    fernet = Fernet(_derive_key(secret))
    return fernet.encrypt(value.encode()).decode()


def decrypt_value(token: str, secret: str) -> Optional[str]:
    """Decrypt a Fernet token. Returns None if decryption fails."""
    try:
        fernet = Fernet(_derive_key(secret))
        return fernet.decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        return None

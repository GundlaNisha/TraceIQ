"""Symmetric encryption utilities for sensitive third-party credentials at rest.

Uses Fernet (AES-128-CBC + HMAC-SHA256) from ``cryptography`` with a versioned
prefix (``enc:v1:``) so encrypted values can coexist safely with legacy
unencrypted rows during zero-downtime rollouts.
"""

from __future__ import annotations

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)

_ENC_PREFIX = "enc:v1:"
_warned_dev_fallback = False


def _resolve_fernet_key() -> bytes:
    """Resolve or derive a valid 32-byte URL-safe base64 Fernet key."""
    global _warned_dev_fallback

    explicit = (settings.credential_encryption_key or "").strip()
    if explicit:
        # Accept either a raw Fernet key (44 urlsafe base64 chars) or arbitrary passphrase
        raw_bytes = explicit.encode("utf-8")
        try:
            Fernet(raw_bytes)
            return raw_bytes
        except Exception:
            digest = hashlib.sha256(raw_bytes).digest()
            return base64.urlsafe_b64encode(digest)

    if settings.environment == "production":
        raise RuntimeError(
            "CREDENTIAL_ENCRYPTION_KEY must be configured in production to store OAuth tokens and API secrets securely."
        )

    if not _warned_dev_fallback:
        _warned_dev_fallback = True
        logger.warning(
            "CREDENTIAL_ENCRYPTION_KEY is not set; using derived development encryption key. "
            "Set CREDENTIAL_ENCRYPTION_KEY in production."
        )

    seed = (
        settings.clerk_secret_key
        or settings.database_url
        or "traceiq-local-dev-credential-seed"
    )
    digest = hashlib.sha256(f"traceiq:cred:v1:{seed}".encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_secret(plaintext: str | None) -> str:
    """Encrypt a secret string with Fernet, returning an ``enc:v1:`` prefixed token."""
    if not plaintext:
        return ""
    if plaintext.startswith(_ENC_PREFIX):
        return plaintext
    f = Fernet(_resolve_fernet_key())
    token = f.encrypt(plaintext.encode("utf-8")).decode("utf-8")
    return f"{_ENC_PREFIX}{token}"


def decrypt_secret(ciphertext: str | None) -> str:
    """Decrypt an ``enc:v1:`` secret, or return legacy plaintext unchanged."""
    if not ciphertext:
        return ""
    if not ciphertext.startswith(_ENC_PREFIX):
        # Legacy plaintext credential stored prior to encryption rollout
        return ciphertext
    raw_token = ciphertext[len(_ENC_PREFIX) :]
    try:
        f = Fernet(_resolve_fernet_key())
        return f.decrypt(raw_token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        logger.error("Failed to decrypt stored credential (InvalidToken — check CREDENTIAL_ENCRYPTION_KEY).")
        raise RuntimeError("Stored credential could not be decrypted with the active encryption key.") from exc

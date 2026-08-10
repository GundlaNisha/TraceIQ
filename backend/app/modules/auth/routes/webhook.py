"""Clerk webhook handler.

Receives user lifecycle events from Clerk, verifies the ``svix`` signature, and
keeps the local ``users`` table in sync. Always responds with 2xx for events
Clerk expects us to acknowledge — Clerk will retry on non-2xx.

Setup:
    1. In the Clerk dashboard, add an endpoint pointing at
       ``https://<your-api>/api/v1/webhooks/clerk`` and subscribe to the
       ``user.*`` events.
    2. Copy the "Signing Secret" into the ``CLERK_WEBHOOK_SECRET`` env var.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Request, status
from svix.exceptions import WebhookVerificationError
from svix.webhooks import Webhook

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.modules.auth.services.user_sync import (
    delete_user,
    upsert_user_from_clerk_event,
)

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

# Headers Clerk forwards with every webhook. The names are defined by Svix.
SVIX_ID_HEADER = "svix-id"
SVIX_TIMESTAMP_HEADER = "svix-timestamp"
SVIX_SIGNATURE_HEADER = "svix-signature"


@router.post("/clerk")
async def clerk_webhook(request: Request) -> dict:
    secret = settings.clerk_webhook_secret
    if not secret:
        # Misconfiguration is a deployment bug, not a per-request error.
        # Returning 503 makes the failure obvious in Clerk's dashboard without
        # looking like a successful delivery.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CLERK_WEBHOOK_SECRET is not configured",
        )

    # Raw body is required for signature verification — reading the parsed JSON
    # would change whitespace and break the HMAC.
    raw_body = await request.body()

    headers = request.headers
    svix_id = headers.get(SVIX_ID_HEADER)
    svix_timestamp = headers.get(SVIX_TIMESTAMP_HEADER)
    svix_signature = headers.get(SVIX_SIGNATURE_HEADER)
    if not (svix_id and svix_timestamp and svix_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing one of svix-id / svix-timestamp / svix-signature headers",
        )

    try:
        Webhook(secret).verify(
            raw_body,
            {
                SVIX_ID_HEADER: svix_id,
                SVIX_TIMESTAMP_HEADER: svix_timestamp,
                SVIX_SIGNATURE_HEADER: svix_signature,
            },
        )
    except WebhookVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        ) from exc

    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Body is not valid JSON"
        ) from exc

    event_type = event.get("type")
    data = event.get("data") or {}

    # Use a fresh session — webhook handlers don't share the request lifecycle
    # with any FastAPI dependency, and `get_db` would be outside its context.
    async with AsyncSessionLocal() as db:
        if event_type in ("user.created", "user.updated"):
            await upsert_user_from_clerk_event(db, data)
        elif event_type == "user.deleted":
            user_id = data.get("id") or data.get("user_id")
            if user_id:
                await delete_user(db, user_id)
        # Any other event type — acknowledge so Clerk stops retrying, but do
        # nothing. Per Clerk docs, we must always 200 unless something is
        # genuinely wrong with the request itself.

    return {"received": True, "type": event_type}

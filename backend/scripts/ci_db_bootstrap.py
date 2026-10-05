"""One-shot production DB bootstrap for CI (NeonDB).

Creates required Postgres extensions. Safe to re-run (IF NOT EXISTS).
Migrations themselves run via `alembic upgrade head` as a separate step.
"""

import asyncio
import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def main() -> None:
    url = os.environ["DATABASE_URL"]
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.commit()
        rows = (
            await conn.execute(text("SELECT extname FROM pg_extension"))
        ).scalars().all()
        have = sorted(set(rows) & {"vector", "pg_trgm"})
        print(f"extensions: {have}")
        missing = {"vector", "pg_trgm"} - set(have)
        if missing:
            raise SystemExit(f"MISSING extensions after CREATE: {sorted(missing)}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

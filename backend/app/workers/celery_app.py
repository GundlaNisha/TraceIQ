from celery import Celery
from celery.signals import worker_process_init

from app.core.config import settings
from app.db.session import engine

celery_app = Celery(
    "traceiq",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.repo_sync",
        "app.workers.repo_index",
        "app.workers.impact_analysis",
        "app.workers.commit_review",
        "app.workers.pr_draft",
        "app.workers.pr_review",
    ],
)

celery_app.conf.update(
    # Serialisation
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Reliability: acknowledge only after task completes, so Celery re-queues
    # the task if the worker crashes mid-execution.
    task_acks_late=True,
    # Timeouts: raise SoftTimeLimitExceeded at 10 min, hard-kill at 15 min.
    task_soft_time_limit=settings.celery_task_soft_time_limit,
    task_time_limit=settings.celery_task_time_limit,
    # Clean up result metadata after 24 hours to prevent Redis bloat.
    result_expires=86400,
    # Timezone
    timezone="UTC",
    enable_utc=True,
)


@worker_process_init.connect
def init_worker(**kwargs):
    # Dispose of the connection pool when a worker process starts.
    # This prevents "SSL connection has been closed unexpectedly" errors
    # when Celery forks the parent process.
    engine.sync_engine.dispose()

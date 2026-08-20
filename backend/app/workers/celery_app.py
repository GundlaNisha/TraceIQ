from celery import Celery
from celery.signals import worker_process_init

# Ensure all SQLAlchemy models are registered in Base.metadata for Celery worker processes
import app.modules.audit.models.audit
import app.modules.auth.models.user
import app.modules.github.models.installation
import app.modules.impact.models.impact
import app.modules.indexing.models.index_models
import app.modules.pr.models.draft
import app.modules.repository.models.repo
import app.modules.requirement.models.req
import app.modules.review.models.rev_models  # noqa: F401
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

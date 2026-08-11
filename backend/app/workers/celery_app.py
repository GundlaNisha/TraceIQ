from celery import Celery
from celery.signals import worker_process_init

from app.core.config import settings
from app.db.session import engine

celery_app = Celery("traceiq", broker=settings.redis_url, backend=settings.redis_url, include=["app.workers.repo_sync", "app.workers.repo_index", "app.workers.impact_analysis", "app.workers.commit_review", "app.workers.pr_draft"])
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"

@worker_process_init.connect
def init_worker(**kwargs):
    # Dispose of the connection pool when a worker process starts.
    # This prevents "SSL connection has been closed unexpectedly" errors 
    # when Celery forks the parent process.
    engine.sync_engine.dispose()

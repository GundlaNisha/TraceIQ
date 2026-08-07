from celery import Celery
from app.core.config import settings

celery_app = Celery("traceiq", broker=settings.redis_url, backend=settings.redis_url, include=["app.workers.repo_sync", "app.workers.repo_index"])
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"

from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Models are imported in env.py instead of here to prevent circular imports.
from app.modules.impact.models.impact import AnalysisJob, ImpactResult  # noqa: F401

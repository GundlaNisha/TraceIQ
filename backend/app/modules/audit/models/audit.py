from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.db.base.models import Base
from app.db.base.mixins import UUIDPrimaryKeyMixin

class AuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_logs"
    
    user_id: Mapped[str] = mapped_column(ForeignKey("neon_auth.user.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100))  # e.g. "repo.sync", "analysis.create"
    resource_type: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    # No updated_at — append only

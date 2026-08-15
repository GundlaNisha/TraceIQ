from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class GithubInstallation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "github_installations"
    
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    installation_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    account_name: Mapped[str] = mapped_column(String(255))

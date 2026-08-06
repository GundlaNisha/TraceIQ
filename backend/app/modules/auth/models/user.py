from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Boolean, Text
from app.db.base.models import Base

class User(Base):
    __tablename__ = "user"
    __table_args__ = {"schema": "neon_auth"}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False)
    image: Mapped[str] = mapped_column(Text, nullable=True)

import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Boolean, Text, Uuid
from app.db.base.models import Base

class User(Base):
    __tablename__ = "user"
    __table_args__ = {"schema": "neon_auth"}

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column("emailVerified", Boolean, nullable=False)
    image: Mapped[str] = mapped_column(Text, nullable=True)

import uuid
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.db.base.models import Base
from app.db.base.mixins import UUIDPrimaryKeyMixin, TimestampMixin

class RepositoryFile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "repository_files"
    repository_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), index=True)
    snapshot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repository_snapshots.id", ondelete="CASCADE"), index=True)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=True)

class CodeSymbol(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "code_symbols"
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repository_files.id", ondelete="CASCADE"), index=True)
    symbol_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    symbol_type: Mapped[str] = mapped_column(String(50))  # function, class, method
    line_start: Mapped[int] = mapped_column(Integer)
    line_end: Mapped[int] = mapped_column(Integer)

class CodeChunk(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "code_chunks"
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repository_files.id", ondelete="CASCADE"), index=True)
    repository_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), index=True)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer)
    line_start: Mapped[int] = mapped_column(Integer)
    line_end: Mapped[int] = mapped_column(Integer)

class CodeEmbedding(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "code_embeddings"
    chunk_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("code_chunks.id", ondelete="CASCADE"), unique=True, index=True)
    # Using 384 dimensions because we are using sentence-transformers (all-MiniLM) for free instead of OpenAI!
    embedding: Mapped[list[float]] = mapped_column(Vector(384), nullable=False)

class CodeDependency(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "code_dependencies"
    repository_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), index=True)
    source_file: Mapped[str] = mapped_column(String(1024))
    target_file: Mapped[str] = mapped_column(String(1024))

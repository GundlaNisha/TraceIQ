from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Every module's models must be imported here so Alembic autogenerate sees them.
# Add imports here as you build each phase:
# from app.modules.auth.models.user import User
# from app.modules.repository.models.repo import Repository, ...
# etc.

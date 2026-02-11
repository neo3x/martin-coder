"""
Database Configuration and Session Management
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData, text
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=convention)


class Base(DeclarativeBase):
    """Base class for all models"""
    metadata = metadata


def get_database_url() -> str:
    """Get async database URL"""
    url = settings.DATABASE_URL

    # Convert to async URL if needed
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://")
    elif url.startswith("sqlite:///"):
        url = url.replace("sqlite:///", "sqlite+aiosqlite:///")

    return url


# Create async engine
engine = create_async_engine(
    get_database_url(),
    echo=settings.DEBUG,
    future=True
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def init_db():
    """Initialize database tables"""
    from app.models import user, project, chat  # Import all models

    async with engine.begin() as conn:
        db_url = get_database_url()
        use_pg_lock = db_url.startswith("postgresql+asyncpg://")

        if use_pg_lock:
            # Serialize schema creation across concurrent app startups.
            await conn.execute(text("SELECT pg_advisory_lock(987654321)"))

        try:
            await conn.run_sync(Base.metadata.create_all)
        finally:
            if use_pg_lock:
                await conn.execute(text("SELECT pg_advisory_unlock(987654321)"))

    logger.info("Database tables created")

    # Create first admin user if not exists
    await create_first_admin()


async def create_first_admin():
    """Create the first admin user if it doesn't exist"""
    from app.models.user import User
    from app.core.security import get_password_hash
    from sqlalchemy import select

    async with async_session_maker() as session:
        # Check if admin exists
        result = await session.execute(
            select(User).where(User.email == settings.FIRST_ADMIN_EMAIL)
        )
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                email=settings.FIRST_ADMIN_EMAIL,
                username="admin",
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                is_active=True,
                is_superuser=True
            )
            session.add(admin)
            await session.commit()
            logger.info(f"Created admin user: {settings.FIRST_ADMIN_EMAIL}")


async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

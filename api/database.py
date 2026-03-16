from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import time

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://ph_user:ph_pass@db:5432/product_health")

def _create_engine_with_retry(url, max_retries=30, delay=2):
    """Create a SQLAlchemy engine, retrying until Postgres is ready."""
    engine = create_engine(url)
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"Database connected on attempt {attempt}")
            return engine
        except Exception as e:
            if attempt == max_retries:
                raise RuntimeError(f"Could not connect to database after {max_retries} attempts: {e}")
            print(f"Database not ready (attempt {attempt}/{max_retries}), retrying in {delay}s...")
            time.sleep(delay)
    return engine

# Create database engine (retries until Postgres accepts connections)
engine = _create_engine_with_retry(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy declarative models
Base = declarative_base()

# Dependency for FastAPI to get DB sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

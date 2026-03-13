from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import datetime
from sqlalchemy.sql import func
from database import Base

class TestSession(Base):
    __tablename__ = "test_sessions"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # File Metadata
    server = Column(String)
    start_time = Column(String)  # Stored as string to match existing parsed logic
    end_time = Column(String)
    original_filename = Column(String)

    # Session Metadata
    release_version = Column(String, nullable=True)
    robot_ids = Column(JSON, nullable=True)  # List of integers
    notes = Column(String, nullable=True)
    patches = Column(JSON, nullable=True)  # List of patch dicts

    # Relationship
    stops = relationship("StopRecord", back_populates="session", cascade="all, delete-orphan")

class StopRecord(Base):
    __tablename__ = "stop_records"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("test_sessions.id"))

    robot_id = Column(Integer)
    timestamp = Column(String)
    playback_url = Column(String, nullable=True)
    robot_id_timestamp = Column(String, nullable=True)
    
    # Hierarchical Stop Reasons
    l1_stop_reason = Column(String)
    l2_stop_reason = Column(String)
    l3_stop_reason = Column(String)
    
    stop_location_code = Column(String, nullable=True)
    
    # Coordinates
    pose_x = Column(Float, nullable=True)
    pose_y = Column(Float, nullable=True)
    
    # Analytics Variables
    stop_duration = Column(Float)
    triage_comment = Column(String, nullable=True)
    support_intervention_made = Column(Boolean, default=False)
    pallet_loaded = Column(Boolean, default=False)
    
    # Extracted Environment / Software info
    floor = Column(String, nullable=True)
    client = Column(String, nullable=True)
    application = Column(String, nullable=True)
    nexus_sw_version = Column(String, nullable=True)
    nrv_sw_version = Column(String, nullable=True)
    vros_sw_version = Column(String, nullable=True)
    
    # Future-proofing: Arbitrary JSON data (like Athena metrics, unpredictable parsed cols)
    extra_data = Column(JSON, nullable=True)

    # Relationship
    session = relationship("TestSession", back_populates="stops")

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import engine, get_db

# Create DB tables (In production, use Alembic migrations instead)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ProductHealth API", version="1.0.0")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "FastAPI is running alongside Postgres"}

@app.get("/api/sessions", response_model=List[schemas.TestSessionResponse])
def get_sessions(db: Session = Depends(get_db)):
    # Load all sessions from Postgres
    db_sessions = db.query(models.TestSession).all()
    
    # We must transform the SQLAlchemy model back to the Pydantic JSON structure 
    # expected by the React frontend store.
    results = []
    for s in db_sessions:
        # Recreate nested structs
        # Note: mapping underscores to camelCase to match the frontend types
        file_meta = schemas.FileMetadataBase(
            server=s.server,
            startTime=s.start_time,
            endTime=s.end_time,
            originalFilename=s.original_filename
        )
        sess_meta = schemas.SessionMetadataBase(
            releaseVersion=s.release_version,
            robotIds=s.robot_ids or [],
            notes=s.notes,
            patches=s.patches or []
        )
        
        stops = []
        for st in s.stops:
            stops.append(schemas.StopRecordBase(
                id=st.id,
                robotId=st.robot_id,
                timestamp=st.timestamp,
                playbackUrl=st.playback_url,
                robotIdTimestamp=st.robot_id_timestamp,
                l1StopReason=st.l1_stop_reason,
                l2StopReason=st.l2_stop_reason,
                l3StopReason=st.l3_stop_reason,
                stopLocationCode=st.stop_location_code,
                poseX=st.pose_x,
                poseY=st.pose_y,
                stopDuration=st.stop_duration,
                triageComment=st.triage_comment,
                supportInterventionMade=st.support_intervention_made,
                palletLoaded=st.pallet_loaded,
                floor=st.floor,
                client=st.client,
                application=st.application,
                nexusSwVersion=st.nexus_sw_version,
                nrvSwVersion=st.nrv_sw_version,
                vrosSwVersion=st.vros_sw_version,
                extraData=st.extra_data
            ))
            
        results.append(schemas.TestSessionResponse(
            id=s.id,
            fileMetadata=file_meta,
            sessionMetadata=sess_meta,
            stops=stops,
            createdAt=s.created_at.isoformat() if s.created_at else ""
        ))
        
    return results

@app.post("/api/sessions", response_model=schemas.TestSessionResponse)
def create_session(session_in: schemas.TestSessionCreate, db: Session = Depends(get_db)):
    # Check if session already exists
    if db.query(models.TestSession).filter(models.TestSession.id == session_in.id).first():
        raise HTTPException(status_code=400, detail="Session with this ID already exists")

    # Create Session record
    db_session = models.TestSession(
        id=session_in.id,
        server=session_in.fileMetadata.server,
        start_time=session_in.fileMetadata.startTime,
        end_time=session_in.fileMetadata.endTime,
        original_filename=session_in.fileMetadata.originalFilename,
        release_version=session_in.sessionMetadata.releaseVersion,
        robot_ids=session_in.sessionMetadata.robotIds,
        notes=session_in.sessionMetadata.notes,
        patches=[p.model_dump() for p in session_in.sessionMetadata.patches]
    )
    db.add(db_session)
    
    # Create all Stop records
    for stop_in in session_in.stops:
        db_stop = models.StopRecord(
            id=stop_in.id,
            session_id=session_in.id,
            robot_id=stop_in.robotId,
            timestamp=stop_in.timestamp,
            playback_url=stop_in.playbackUrl,
            robot_id_timestamp=stop_in.robotIdTimestamp,
            l1_stop_reason=stop_in.l1StopReason,
            l2_stop_reason=stop_in.l2StopReason,
            l3_stop_reason=stop_in.l3StopReason,
            stop_location_code=stop_in.stopLocationCode,
            pose_x=stop_in.poseX,
            pose_y=stop_in.poseY,
            stop_duration=stop_in.stopDuration,
            triage_comment=stop_in.triageComment,
            support_intervention_made=stop_in.supportInterventionMade,
            pallet_loaded=stop_in.palletLoaded,
            floor=stop_in.floor,
            client=stop_in.client,
            application=stop_in.application,
            nexus_sw_version=stop_in.nexusSwVersion,
            nrv_sw_version=stop_in.nrvSwVersion,
            vros_sw_version=stop_in.vrosSwVersion,
            extra_data=stop_in.extraData
        )
        db.add(db_stop)
        
    db.commit()
    db.refresh(db_session)
    
    # Return exactly what was received (with assumed successful createdAt)
    # The frontend usually doesn't need to re-parse the immediate response anyway,
    # it just needs a 200 OK.
    return {**session_in.model_dump(), "createdAt": db_session.created_at.isoformat()}


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(models.TestSession).filter(models.TestSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Since we use `cascade="all, delete-orphan"` in the model, this deletes stops too
    db.delete(db_session)
    db.commit()
    return {"message": "Session deleted"}

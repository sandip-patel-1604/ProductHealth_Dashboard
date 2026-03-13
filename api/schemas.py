from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict

class PatchRecordBase(BaseModel):
    project: str
    patchSet: str
    description: str

class SessionMetadataBase(BaseModel):
    releaseVersion: Optional[str] = None
    robotIds: List[int]
    notes: Optional[str] = None
    patches: List[PatchRecordBase]

class FileMetadataBase(BaseModel):
    server: str
    startTime: str
    endTime: str
    originalFilename: str

class StopRecordBase(BaseModel):
    id: str
    robotId: int
    timestamp: str
    playbackUrl: Optional[str] = None
    robotIdTimestamp: Optional[str] = None
    l1StopReason: str
    l2StopReason: str
    l3StopReason: str
    stopLocationCode: Optional[str] = None
    poseX: Optional[float] = None
    poseY: Optional[float] = None
    stopDuration: float
    triageComment: Optional[str] = None
    supportInterventionMade: bool
    palletLoaded: bool
    floor: Optional[str] = None
    client: Optional[str] = None
    application: Optional[str] = None
    nexusSwVersion: Optional[str] = None
    nrvSwVersion: Optional[str] = None
    vrosSwVersion: Optional[str] = None
    extraData: Optional[Dict[str, Any]] = None

class TestSessionCreate(BaseModel):
    id: str
    fileMetadata: FileMetadataBase
    sessionMetadata: SessionMetadataBase
    stops: List[StopRecordBase]

class TestSessionResponse(TestSessionCreate):
    createdAt: str
    model_config = ConfigDict(from_attributes=True)

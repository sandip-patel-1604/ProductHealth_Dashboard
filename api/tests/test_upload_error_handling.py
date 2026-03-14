"""
P2 – Preserve upload error handling for async session saves
============================================================
Verifies the API returns HTTP 400 on duplicate session POST so that the
frontend's `await addSession(session)` call can catch and display the
error, rather than it becoming a silent unhandled rejection.

Run from the api/ directory:
    pytest tests/test_upload_error_handling.py -v
"""

import os

# ── MUST happen before any project imports so database.py picks up SQLite ──
os.environ["DATABASE_URL"] = "sqlite:///./test_upload_error_handling.db"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
import main

# In-process SQLite engine (no Docker / psycopg2 required)
engine = create_engine(
    os.environ["DATABASE_URL"],
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


main.app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)

client = TestClient(main.app)


# ── helpers ──────────────────────────────────────────────────────────────────

def _minimal_session(session_id: str, stop_id: str = "row-0") -> dict:
    return {
        "id": session_id,
        "fileMetadata": {
            "server": "b023",
            "startTime": "2026-03-10T17:42:00",
            "endTime": "2026-03-10T19:46:00",
            "originalFilename": "b023_test.ods",
        },
        "sessionMetadata": {
            "releaseVersion": "v1.0.0",
            "robotIds": [220],
            "notes": "pytest run",
            "patches": [],
        },
        "stops": [
            {
                "id": stop_id,
                "robotId": 220,
                "timestamp": "2026-03-10T17:50:00",
                "playbackUrl": None,
                "robotIdTimestamp": None,
                "l1StopReason": "Safety",
                "l2StopReason": "Obstacle",
                "l3StopReason": "Person",
                "stopLocationCode": None,
                "poseX": None,
                "poseY": None,
                "stopDuration": 30.0,
                "triageComment": None,
                "supportInterventionMade": False,
                "palletLoaded": False,
                "floor": None,
                "client": None,
                "application": None,
                "nexusSwVersion": None,
                "nrvSwVersion": None,
                "vrosSwVersion": None,
                "extraData": None,
            }
        ],
    }


# ── tests ────────────────────────────────────────────────────────────────────

class TestUploadErrorHandling:

    def test_first_upload_succeeds(self):
        """A new session is accepted with HTTP 200."""
        response = client.post("/api/sessions", json=_minimal_session("session-p2-001", "stop-p2-001"))
        assert response.status_code == 200, response.text
        assert response.json()["id"] == "session-p2-001"

    def test_duplicate_session_returns_400(self):
        """
        Posting the same session ID twice returns HTTP 400.
        This is the contract that lets `await addSession()` in FileUpload.tsx
        propagate the rejection to the user-visible error handler.
        """
        payload = _minimal_session("session-p2-002", "stop-p2-002")

        first = client.post("/api/sessions", json=payload)
        assert first.status_code == 200, f"First POST failed: {first.text}"

        second = client.post("/api/sessions", json=payload)
        assert second.status_code == 400, (
            f"Expected 400 on duplicate session; got {second.status_code}: {second.text}"
        )
        assert "already exists" in second.json().get("detail", "").lower()

    def test_session_with_multiple_stops_accepted(self):
        """A session with multiple unique stop IDs is accepted in full."""
        payload = _minimal_session("session-p2-003", "stop-p2-003a")
        # Add a second stop with a distinct id
        payload["stops"].append({**payload["stops"][0], "id": "stop-p2-003b"})
        response = client.post("/api/sessions", json=payload)
        assert response.status_code == 200, response.text


# ── cleanup ──────────────────────────────────────────────────────────────────

def teardown_module(module):
    db_file = "./test_upload_error_handling.db"
    if os.path.exists(db_file):
        os.remove(db_file)

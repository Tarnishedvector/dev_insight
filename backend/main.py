"""
DevInsight — FastAPI Application Entry Point
Defines all API endpoints and serves the frontend as static files.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os

from backend.database import insert_api_log, insert_error_log, get_all_api_logs, get_all_error_logs
from backend.services import analyze_error, test_api
from backend.analytics import get_stats

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DevInsight",
    description="Developer tool for error analysis, API testing, and performance analytics.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

class ErrorRequest(BaseModel):
    error_text: str


class ApiTestRequest(BaseModel):
    url: str
    method: str = "GET"
    body: Optional[dict] = None
    headers: Optional[dict] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    """Serve the frontend index.html."""
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {"message": "DevInsight API is running. Frontend not found — place index.html in /frontend."}


@app.post("/analyze-error")
async def analyze_error_endpoint(req: ErrorRequest):
    """Analyse an error string and return a human-readable explanation."""
    result = analyze_error(req.error_text)
    # Store in database
    insert_error_log(req.error_text, result["explanation"])
    return {
        "error_text": req.error_text,
        **result,
    }


@app.post("/test-api")
async def test_api_endpoint(req: ApiTestRequest):
    """Send an HTTP request to the specified URL and return results."""
    result = test_api(req.url, req.method, req.body, req.headers)
    # Store in database
    insert_api_log(req.url, req.method.upper(), result.get("status_code", 0), result.get("response_time", 0))
    return {
        "url": req.url,
        "method": req.method.upper(),
        **result,
    }


@app.get("/stats")
async def stats_endpoint():
    """Return analytics data aggregated from the database."""
    return get_stats()


@app.get("/logs/api")
async def api_logs_endpoint():
    """Return all stored API test logs."""
    return {"logs": get_all_api_logs()}


@app.get("/logs/errors")
async def error_logs_endpoint():
    """Return all stored error analysis logs."""
    return {"logs": get_all_error_logs()}

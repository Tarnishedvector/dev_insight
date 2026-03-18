"""
DevInsight — FastAPI Application Entry Point
Defines all API endpoints and serves the frontend as static files.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import asyncio

from backend.database import insert_api_log, insert_error_log, get_all_api_logs, get_all_error_logs, create_user, verify_user
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


class AuthRequest(BaseModel):
    username: str
    password: str


def get_user_id(req: Request) -> Optional[int]:
    auth = req.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ")[1]
        try:
            return int(token)
        except ValueError:
            pass
    return None

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
async def analyze_error_endpoint(req: ErrorRequest, request: Request):
    """Analyse an error string and return a human-readable explanation."""
    user_id = get_user_id(request)
    result = analyze_error(req.error_text)
    insert_error_log(req.error_text, result["explanation"], user_id)
    return {
        "error_text": req.error_text,
        **result,
    }


@app.post("/test-api")
async def test_api_endpoint(req: ApiTestRequest, request: Request):
    """Send an HTTP request to the specified URL and return results."""
    user_id = get_user_id(request)
    result = test_api(req.url, req.method, req.body, req.headers)
    insert_api_log(req.url, req.method.upper(), result.get("status_code", 0), result.get("response_time", 0), user_id)
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
async def api_logs_endpoint(request: Request):
    """Return all stored API test logs."""
    user_id = get_user_id(request)
    return {"logs": get_all_api_logs(user_id)}


@app.get("/logs/errors")
async def error_logs_endpoint(request: Request):
    """Return all stored error analysis logs."""
    user_id = get_user_id(request)
    return {"logs": get_all_error_logs(user_id)}

@app.post("/signup")
async def signup_endpoint(req: AuthRequest):
    user = create_user(req.username, req.password)
    if user:
        return {"success": True, "token": str(user["id"]), "username": user["username"]}
    return {"success": False, "error": "Username taken"}

@app.post("/login")
async def login_endpoint(req: AuthRequest):
    user = verify_user(req.username, req.password)
    if user:
        return {"success": True, "token": str(user["id"]), "username": user["username"]}
    return {"success": False, "error": "Invalid credentials"}


@app.api_route("/mock", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def mock_endpoint(status: int = 200, delay: int = 0):
    """A mock endpoint that returns a specified status code after a delay."""
    if delay > 0:
        await asyncio.sleep(delay / 1000.0)
    
    return JSONResponse(
        status_code=status,
        content={
            "mock": True,
            "status_code": status,
            "delay_ms": delay,
            "message": f"This is a mock response with status {status}"
        }
    )


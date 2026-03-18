"""
DevInsight — FastAPI Application Entry Point
Defines all API endpoints and serves the frontend as static files.
"""

from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel
from typing import Optional
import os
import asyncio

from backend.database import (
    insert_api_log, insert_error_log, get_all_api_logs, get_all_error_logs, 
    create_user, verify_user, create_mock_endpoint, get_mock_endpoints, 
    delete_mock_endpoint, find_mock_endpoint
)
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

class MockEndpointCreate(BaseModel):
    name: str
    route_path: str
    method: str
    status_code: int
    response_body: str
    delay_ms: int

def get_user_id(req: Request) -> Optional[int]:
    auth = req.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        token = auth.split(" ")[1]
        try:
            return int(token)
        except ValueError:
            pass
    return None

def get_required_user(req: Request) -> int:
    user_id = get_user_id(req)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id

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
    user_id = get_required_user(request)
    result = analyze_error(req.error_text)
    insert_error_log(req.error_text, result["explanation"], user_id)
    return {
        "error_text": req.error_text,
        **result,
    }


@app.post("/test-api")
async def test_api_endpoint(req: ApiTestRequest, request: Request):
    """Send an HTTP request to the specified URL and return results."""
    user_id = get_required_user(request)
    result = test_api(req.url, req.method, req.body, req.headers)
    insert_api_log(req.url, req.method.upper(), result.get("status_code", 0), result.get("response_time", 0), user_id)
    return {
        "url": req.url,
        "method": req.method.upper(),
        **result,
    }


@app.get("/stats")
async def stats_endpoint(request: Request):
    """Return analytics data aggregated from the database."""
    user_id = get_required_user(request)
    return get_stats(user_id)


@app.get("/logs/api")
async def api_logs_endpoint(request: Request):
    """Return all stored API test logs."""
    user_id = get_required_user(request)
    return {"logs": get_all_api_logs(user_id)}


@app.get("/logs/errors")
async def error_logs_endpoint(request: Request):
    """Return all stored error analysis logs."""
    user_id = get_required_user(request)
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
async def standard_mock_endpoint(status: int = 200, delay: int = 0):
    """The legacy simple status mock endpoint."""
    if delay > 0:
        await asyncio.sleep(delay / 1000.0)
    return JSONResponse(
        status_code=status,
        content={"mock": True, "status_code": status, "delay_ms": delay, "message": f"Simulated {status} response."}
    )


@app.get("/injector.js")
async def injector_script(user: int = Query(...)):
    """Dynamically serves an SDK JavaScript file that overrides frontend fetch/XHR network requests."""
    endpoints = get_mock_endpoints(user)
    paths = [ep["route_path"] for ep in endpoints]
    
    js_content = f"""
// ==========================================================
// ⚡ DevInsight Mock API Interceptor SDK
// Automatically routes configured network requests to DevInsight
// ==========================================================
(function() {{
    console.log("⚡ DevInsight Mock API Injector Active for User {user}!");
    
    const MOCK_PATHS = {paths};
    const BASE_SIM_URL = "https://devinsight-backend.onrender.com/sim";
    
    function shouldIntercept(url) {{
        for(let path of MOCK_PATHS) {{
            if(url.includes(path)) return path;
        }}
        return null;
    }}

    // 1. Intercept Fetch API
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {{
        let requestUrl = args[0];
        if (typeof requestUrl === 'object' && requestUrl.url) {{
            requestUrl = requestUrl.url;
        }}
        
        let matchPath = shouldIntercept(requestUrl);
        if(matchPath && !requestUrl.includes("devinsight-backend")) {{
            console.log(`[DevInsight] 🔁 Intercepting mock fetch for: ${{requestUrl}}`);
            if(typeof args[0] === 'string') {{
                args[0] = `${{BASE_SIM_URL}}/${{matchPath}}`;
            }} else {{
                args[0] = new Request(`${{BASE_SIM_URL}}/${{matchPath}}`, args[0]);
            }}
        }}
        return originalFetch.apply(this, args);
    }};

    // 2. Intercept XMLHttpRequests (Axios)
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {{
        let matchPath = shouldIntercept(url);
        if(matchPath && !url.includes("devinsight-backend")) {{
            console.log(`[DevInsight] 🔁 Intercepting mock XHR for: ${{url}}`);
            url = `${{BASE_SIM_URL}}/${{matchPath}}`;
        }}
        return originalOpen.call(this, method, url, ...rest);
    }};
}})();
"""
    return Response(content=js_content, media_type="application/javascript")


@app.get("/mock-api/endpoints")
async def list_custom_mocks(request: Request):
    """List all custom mock endpoints for user."""
    user_id = get_required_user(request)
    return {"endpoints": get_mock_endpoints(user_id)}


@app.post("/mock-api/endpoints")
async def create_custom_mock(req: MockEndpointCreate, request: Request):
    """Create a new custom mock endpoint."""
    user_id = get_required_user(request)
    result = create_mock_endpoint(
        user_id, req.name, req.route_path, req.method, 
        req.status_code, req.response_body, req.delay_ms
    )
    if result["success"]:
        return {"success": True, "id": result["id"]}
    raise HTTPException(status_code=400, detail=result.get("error", "Failed to construct mock API. Possibly duplicate path/method."))


@app.delete("/mock-api/endpoints/{endpoint_id}")
async def delete_custom_mock(endpoint_id: int, request: Request):
    """Delete a specific custom mock endpoint."""
    user_id = get_required_user(request)
    if delete_mock_endpoint(user_id, endpoint_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Endpoint not found")


@app.api_route("/sim/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def simulation_engine(path: str, request: Request):
    """
    The advanced interceptor for custom artificial APIs.
    Looks up `/sim/my-path` in DB and returns the exact custom behavior.
    """
    method = request.method.upper()
    endpoint = find_mock_endpoint(path, method)
    
    if not endpoint:
        raise HTTPException(status_code=404, detail=f"Simulated API Route '/sim/{path}' with method {method} not found in database.")
    
    if endpoint["delay_ms"] > 0:
        await asyncio.sleep(endpoint["delay_ms"] / 1000.0)
        
    return Response(
        content=endpoint.get("response_body", "{}"), 
        status_code=endpoint.get("status_code", 200),
        media_type="application/json"
    )


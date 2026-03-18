"""
DevInsight — PostgreSQL Database Layer
Handles schema creation and CRUD operations for api_logs, error_logs, and users.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import hashlib
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("DATABASE_URL", "postgresql://neondb_owner:****************@ep-autumn-hall-am0qq36p-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

def get_connection():
    """Return a connection to the PostgreSQL database."""
    conn = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
    conn.autocommit = True
    return conn

def init_db() -> None:
    """Create tables if they don't already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_logs (
            id SERIAL PRIMARY KEY,
            url TEXT NOT NULL,
            method TEXT NOT NULL,
            status_code INTEGER,
            response_time REAL,
            timestamp TEXT NOT NULL,
            user_id INTEGER
        )
    """)
    # Add column if upgrading from older schema
    try:
        cursor.execute("ALTER TABLE api_logs ADD COLUMN user_id INTEGER")
    except Exception:
        pass

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS error_logs (
            id SERIAL PRIMARY KEY,
            error_text TEXT NOT NULL,
            explanation TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            user_id INTEGER
        )
    """)
    try:
        cursor.execute("ALTER TABLE error_logs ADD COLUMN user_id INTEGER")
    except Exception:
        pass

    cursor.close()
    conn.close()

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username: str, password: str) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    pwd_hash = hash_password(password)
    try:
        cur.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s) RETURNING id", (username, pwd_hash))
        user_id = cur.fetchone()['id']
        return {"id": user_id, "username": username}
    except Exception:
        return None
    finally:
        cur.close()
        conn.close()

def verify_user(username: str, password: str) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    pwd_hash = hash_password(password)
    cur.execute("SELECT id, username FROM users WHERE username = %s AND password_hash = %s", (username, pwd_hash))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return dict(user) if user else None

# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

def insert_api_log(url: str, method: str, status_code: int, response_time: float, user_id: int = None) -> int:
    """Insert an API test log and return the new row id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO api_logs (url, method, status_code, response_time, timestamp, user_id) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
        (url, method, status_code, round(response_time, 4), datetime.utcnow().isoformat(), user_id),
    )
    row_id = cursor.fetchone()['id']
    cursor.close()
    conn.close()
    return row_id

def insert_error_log(error_text: str, explanation: str, user_id: int = None) -> int:
    """Insert an error analysis log and return the new row id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO error_logs (error_text, explanation, timestamp, user_id) VALUES (%s, %s, %s, %s) RETURNING id",
        (error_text, explanation, datetime.utcnow().isoformat(), user_id),
    )
    row_id = cursor.fetchone()['id']
    cursor.close()
    conn.close()
    return row_id

def get_all_api_logs(user_id: int = None) -> list[dict]:
    """Return every row from api_logs, newest first. Filtered by user if provided."""
    conn = get_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM api_logs WHERE user_id = %s ORDER BY id DESC LIMIT 50", (user_id,))
    else:
        cursor.execute("SELECT * FROM api_logs WHERE user_id IS NULL ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(r) for r in rows]

def get_all_error_logs(user_id: int = None) -> list[dict]:
    """Return every row from error_logs, newest first."""
    conn = get_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM error_logs WHERE user_id = %s ORDER BY id DESC LIMIT 50", (user_id,))
    else:
        cursor.execute("SELECT * FROM error_logs WHERE user_id IS NULL ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(r) for r in rows]

# Auto-initialise tables on first import
try:
    init_db()
except Exception as e:
    print(f"Failed to connect to Neon PostgreSQL. Did you replace the password stars? Error: {e}")

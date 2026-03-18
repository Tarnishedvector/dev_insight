"""
DevInsight — PostgreSQL Database Layer
Handles schema creation and CRUD operations for api_logs and error_logs.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# The user provided a Neon DB URL. Make sure to replace the stars with your actual password!
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
        CREATE TABLE IF NOT EXISTS api_logs (
            id SERIAL PRIMARY KEY,
            url TEXT NOT NULL,
            method TEXT NOT NULL,
            status_code INTEGER,
            response_time REAL,
            timestamp TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS error_logs (
            id SERIAL PRIMARY KEY,
            error_text TEXT NOT NULL,
            explanation TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    cursor.close()
    conn.close()

# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

def insert_api_log(url: str, method: str, status_code: int, response_time: float) -> int:
    """Insert an API test log and return the new row id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO api_logs (url, method, status_code, response_time, timestamp) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (url, method, status_code, round(response_time, 4), datetime.utcnow().isoformat()),
    )
    row_id = cursor.fetchone()['id']
    cursor.close()
    conn.close()
    return row_id

def insert_error_log(error_text: str, explanation: str) -> int:
    """Insert an error analysis log and return the new row id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO error_logs (error_text, explanation, timestamp) VALUES (%s, %s, %s) RETURNING id",
        (error_text, explanation, datetime.utcnow().isoformat()),
    )
    row_id = cursor.fetchone()['id']
    cursor.close()
    conn.close()
    return row_id

def get_all_api_logs() -> list[dict]:
    """Return every row from api_logs, newest first."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM api_logs ORDER BY id DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(r) for r in rows]

def get_all_error_logs() -> list[dict]:
    """Return every row from error_logs, newest first."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM error_logs ORDER BY id DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(r) for r in rows]

# Auto-initialise tables on first import
try:
    init_db()
except Exception as e:
    print(f"Failed to connect to Neon PostgreSQL. Did you replace the password stars? Error: {e}")

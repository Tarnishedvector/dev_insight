"""
DevInsight — Analytics Module (PostgreSQL version)
Computes aggregate statistics from the database.
"""

from backend.database import get_connection

def get_stats() -> dict:
    conn = get_connection()
    cur = conn.cursor()

    # --- API metrics ---
    cur.execute("SELECT COUNT(*) as cnt FROM api_logs")
    total_api = cur.fetchone()['cnt']

    cur.execute("SELECT AVG(response_time) as avg_rt FROM api_logs")
    avg_rt = cur.fetchone()['avg_rt']
    avg_rt = round(float(avg_rt), 4) if avg_rt else 0

    # --- Error metrics ---
    cur.execute("SELECT COUNT(*) as cnt FROM error_logs")
    total_errors = cur.fetchone()['cnt']

    # Error-frequency breakdown
    cur.execute("""
        SELECT explanation, COUNT(*) as cnt
        FROM error_logs
        GROUP BY explanation
        ORDER BY cnt DESC
        LIMIT 10
    """)
    error_freq = [{"explanation": row['explanation'][:80], "count": row['cnt']} for row in cur.fetchall()]

    # --- Recent activity ---
    cur.execute("SELECT * FROM api_logs ORDER BY id DESC LIMIT 10")
    recent_api = cur.fetchall()

    cur.execute("SELECT * FROM error_logs ORDER BY id DESC LIMIT 10")
    recent_errors = cur.fetchall()

    # --- Time-series for chart ---
    cur.execute("SELECT url, response_time, timestamp FROM api_logs ORDER BY id DESC LIMIT 30")
    time_series = cur.fetchall()
    time_series.reverse()  # chronological order

    # --- Status code distribution ---
    cur.execute("""
        SELECT status_code, COUNT(*) as cnt
        FROM api_logs
        GROUP BY status_code
        ORDER BY cnt DESC
    """)
    status_dist = [{"status_code": row['status_code'], "count": row['cnt']} for row in cur.fetchall()]

    cur.close()
    conn.close()

    return {
        "total_api_requests": total_api,
        "average_response_time": avg_rt,
        "total_error_queries": total_errors,
        "error_frequency": error_freq,
        "status_code_distribution": status_dist,
        "recent_api_logs": recent_api,
        "recent_error_logs": recent_errors,
        "response_time_series": time_series,
    }

"""
DevInsight — Analytics Module (PostgreSQL version)
Computes aggregate statistics from the database.
"""

from backend.database import get_connection

def get_stats(user_id: int) -> dict:
    conn = get_connection()
    cur = conn.cursor()

    where_clause = "WHERE user_id = %(uid)s"
    params = {'uid': user_id}

    # --- API metrics ---
    cur.execute(f"SELECT COUNT(*) as cnt FROM api_logs {where_clause}", params)
    total_api = cur.fetchone()['cnt']

    cur.execute(f"SELECT AVG(response_time) as avg_rt, MIN(response_time) as min_rt, MAX(response_time) as max_rt FROM api_logs {where_clause}", params)
    rt_row = cur.fetchone()
    avg_rt = round(float(rt_row['avg_rt']), 4) if rt_row and rt_row['avg_rt'] is not None else 0
    fastest_rt = round(float(rt_row['min_rt']), 4) if rt_row and rt_row['min_rt'] is not None else 0
    slowest_rt = round(float(rt_row['max_rt']), 4) if rt_row and rt_row['max_rt'] is not None else 0

    # --- Error metrics ---
    cur.execute(f"SELECT COUNT(*) as cnt FROM error_logs {where_clause}", params)
    total_errors = cur.fetchone()['cnt']
    
    error_rate = 0.0
    if total_api > 0:
        error_rate = round((total_errors / total_api) * 100, 2)

    # Error-frequency breakdown
    cur.execute(f"""
        SELECT explanation, COUNT(*) as cnt
        FROM error_logs
        {where_clause}
        GROUP BY explanation
        ORDER BY cnt DESC
        LIMIT 10
    """, params)
    error_freq = [{"explanation": row['explanation'][:80], "count": row['cnt']} for row in cur.fetchall()]

    # --- Recent activity ---
    cur.execute(f"SELECT * FROM api_logs {where_clause} ORDER BY id DESC LIMIT 10", params)
    recent_api = cur.fetchall()

    cur.execute(f"SELECT * FROM error_logs {where_clause} ORDER BY id DESC LIMIT 10", params)
    recent_errors = cur.fetchall()

    # --- Time-series for chart ---
    cur.execute(f"SELECT url, response_time, timestamp FROM api_logs {where_clause} ORDER BY id DESC LIMIT 30", params)
    time_series = cur.fetchall()
    time_series.reverse()  # chronological order

    # --- Status code distribution ---
    cur.execute(f"""
        SELECT status_code, COUNT(*) as cnt
        FROM api_logs
        {where_clause}
        GROUP BY status_code
        ORDER BY cnt DESC
    """, params)
    status_dist = [{"status_code": row['status_code'], "count": row['cnt']} for row in cur.fetchall()]

    cur.close()
    conn.close()

    return {
        "total_api_requests": total_api,
        "average_response_time": avg_rt,
        "fastest_request": fastest_rt,
        "slowest_request": slowest_rt,
        "total_error_queries": total_errors,
        "error_rate": error_rate,
        "error_frequency": error_freq,
        "status_code_distribution": status_dist,
        "recent_api_logs": recent_api,
        "recent_error_logs": recent_errors,
        "response_time_series": time_series,
    }

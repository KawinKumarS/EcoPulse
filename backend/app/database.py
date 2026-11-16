import sqlite3
import json
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from .config import DB_PATH

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    conn = get_db_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                occupancy INTEGER NOT NULL,
                light_level INTEGER NOT NULL,
                temperature REAL NOT NULL,
                humidity REAL,
                solar_voltage REAL NOT NULL,
                battery_voltage REAL NOT NULL,
                solar_power_w REAL NOT NULL,
                load_power_w REAL NOT NULL,
                net_power_w REAL NOT NULL,
                estimated_battery_pct REAL NOT NULL,
                light_state INTEGER NOT NULL,
                fan_state INTEGER NOT NULL,
                mode TEXT NOT NULL,
                is_simulated INTEGER NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings(timestamp);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                event_type TEXT NOT NULL,
                device TEXT,
                state INTEGER,
                source TEXT NOT NULL,
                details TEXT
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                acknowledged INTEGER DEFAULT 0,
                resolved INTEGER DEFAULT 0,
                resolved_at REAL
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS system_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at REAL NOT NULL
            );
        """)
    conn.close()

def insert_reading(data: Dict[str, Any]) -> int:
    conn = get_db_connection()
    with conn:
        cursor = conn.execute("""
            INSERT INTO readings (
                timestamp, occupancy, light_level, temperature, humidity,
                solar_voltage, battery_voltage, solar_power_w, load_power_w,
                net_power_w, estimated_battery_pct, light_state, fan_state,
                mode, is_simulated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("timestamp", time.time()),
            1 if data.get("occupancy") else 0,
            int(data.get("light_level", 0)),
            float(data.get("temperature", 0.0)),
            float(data.get("humidity", 50.0)),
            float(data.get("solar_voltage", 0.0)),
            float(data.get("battery_voltage", 0.0)),
            float(data.get("solar_power_w", 0.0)),
            float(data.get("load_power_w", 0.0)),
            float(data.get("net_power_w", 0.0)),
            float(data.get("estimated_battery_pct", 0.0)),
            1 if data.get("light") else 0,
            1 if data.get("fan") else 0,
            str(data.get("mode", "AUTO")),
            1 if data.get("is_simulated") else 0
        ))
        row_id = cursor.lastrowid
    conn.close()
    return row_id

def insert_event(event_type: str, source: str, device: Optional[str] = None, state: Optional[bool] = None, details: Optional[str] = None):
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO events (timestamp, event_type, device, state, source, details)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            time.time(),
            event_type,
            device,
            1 if state is True else (0 if state is False else None),
            source,
            details
        ))
    conn.close()

def insert_alert(alert_type: str, severity: str, message: str) -> int:
    conn = get_db_connection()
    with conn:
        # Check if an unresolved alert of the same type already exists within last 60 seconds
        recent = conn.execute("""
            SELECT id FROM alerts
            WHERE alert_type = ? AND resolved = 0 AND timestamp > ?
        """, (alert_type, time.time() - 60)).fetchone()
        
        if recent:
            conn.close()
            return recent["id"]

        cursor = conn.execute("""
            INSERT INTO alerts (timestamp, alert_type, severity, message, acknowledged, resolved)
            VALUES (?, ?, ?, ?, 0, 0)
        """, (time.time(), alert_type, severity, message))
        alert_id = cursor.lastrowid
    conn.close()
    return alert_id

def acknowledge_alert(alert_id: int):
    conn = get_db_connection()
    with conn:
        conn.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
    conn.close()

def resolve_alert(alert_type: str):
    conn = get_db_connection()
    with conn:
        conn.execute("""
            UPDATE alerts
            SET resolved = 1, resolved_at = ?
            WHERE alert_type = ? AND resolved = 0
        """, (time.time(), alert_type))
    conn.close()

def get_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT id, timestamp, alert_type, severity, message, acknowledged, resolved, resolved_at
        FROM alerts
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_readings(start_ts: Optional[float] = None, end_ts: Optional[float] = None, limit: int = 200, is_simulated: Optional[bool] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    query = "SELECT * FROM readings WHERE 1=1"
    params: List[Any] = []

    if start_ts is not None:
        query += " AND timestamp >= ?"
        params.append(start_ts)
    if end_ts is not None:
        query += " AND timestamp <= ?"
        params.append(end_ts)
    if is_simulated is not None:
        query += " AND is_simulated = ?"
        params.append(1 if is_simulated else 0)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    # Return chronologically ascending for charts
    result = [dict(r) for r in rows]
    result.reverse()
    return result

def get_total_readings_count() -> int:
    conn = get_db_connection()
    row = conn.execute("SELECT COUNT(*) as cnt FROM readings").fetchone()
    conn.close()
    return row["cnt"] if row else 0

def get_energy_summary(since_ts: Optional[float] = None, is_simulated: Optional[bool] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    if since_ts is None:
        since_ts = time.time() - 86400 # Last 24 hours

    query = "SELECT timestamp, solar_power_w, load_power_w FROM readings WHERE timestamp >= ?"
    params: List[Any] = [since_ts]
    if is_simulated is not None:
        query += " AND is_simulated = ?"
        params.append(1 if is_simulated else 0)
    query += " ORDER BY timestamp ASC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    if not rows or len(rows) < 2:
        return {
            "total_solar_wh": 0.0,
            "total_load_wh": 0.0,
            "net_wh": 0.0,
            "solar_contribution_pct": 0.0,
            "co2_saved_grams": 0.0,
            "data_points": len(rows)
        }

    # Numerical integration (trapezoidal rule)
    total_solar_joules = 0.0
    total_load_joules = 0.0

    for i in range(1, len(rows)):
        dt = rows[i]["timestamp"] - rows[i-1]["timestamp"]
        if 0 < dt <= 10.0:
            avg_solar_w = (rows[i]["solar_power_w"] + rows[i-1]["solar_power_w"]) / 2.0
            avg_load_w = (rows[i]["load_power_w"] + rows[i-1]["load_power_w"]) / 2.0
            total_solar_joules += avg_solar_w * dt
            total_load_joules += avg_load_w * dt

    total_solar_wh = total_solar_joules / 3600.0
    total_load_wh = total_load_joules / 3600.0
    net_wh = total_solar_wh - total_load_wh

    contrib_pct = (total_solar_wh / total_load_wh * 100.0) if total_load_wh > 0 else 0.0
    if contrib_pct > 100.0:
        contrib_pct = 100.0

    co2_saved_grams = total_solar_wh * 0.82

    return {
        "total_solar_wh": round(total_solar_wh, 4),
        "total_load_wh": round(total_load_wh, 4),
        "net_wh": round(net_wh, 4),
        "solar_contribution_pct": round(contrib_pct, 1),
        "co2_saved_grams": round(co2_saved_grams, 2),
        "data_points": len(rows)
    }

def get_energy_buckets(timeframe: str = "hourly", is_simulated: Optional[bool] = None) -> List[Dict[str, Any]]:
    """Aggregates real SQLite readings into hourly or daily Wh buckets."""
    conn = get_db_connection()
    since_ts = time.time() - (7 * 86400 if timeframe == "daily" else 86400)
    query = "SELECT timestamp, solar_power_w, load_power_w FROM readings WHERE timestamp >= ?"
    params: List[Any] = [since_ts]
    if is_simulated is not None:
        query += " AND is_simulated = ?"
        params.append(1 if is_simulated else 0)
    query += " ORDER BY timestamp ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    if len(rows) < 2:
        return []

    buckets: Dict[str, Dict[str, float]] = {}
    fmt = "%a %d" if timeframe == "daily" else "%H:00"

    for i in range(1, len(rows)):
        dt = rows[i]["timestamp"] - rows[i-1]["timestamp"]
        if 0 < dt <= 10.0:
            label = datetime.fromtimestamp(rows[i]["timestamp"]).strftime(fmt)
            if label not in buckets:
                buckets[label] = {"solar_j": 0.0, "load_j": 0.0}
            buckets[label]["solar_j"] += ((rows[i]["solar_power_w"] + rows[i-1]["solar_power_w"]) / 2.0) * dt
            buckets[label]["load_j"] += ((rows[i]["load_power_w"] + rows[i-1]["load_power_w"]) / 2.0) * dt

    return [
        {
            "time": k,
            "solar_wh": round(v["solar_j"] / 3600.0, 4),
            "load_wh": round(v["load_j"] / 3600.0, 4)
        }
        for k, v in buckets.items()
    ]

def set_config(key: str, value: Any):
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO system_config (key, value, updated_at)
            VALUES (?, ?, ?)
        """, (key, json.dumps(value), time.time()))
    conn.close()

def get_config(key: str, default: Any = None) -> Any:
    conn = get_db_connection()
    row = conn.execute("SELECT value FROM system_config WHERE key = ?", (key,)).fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["value"])
        except Exception:
            return row["value"]
    return default

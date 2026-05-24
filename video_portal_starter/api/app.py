import os
from datetime import datetime

import psycopg
from fastapi import FastAPI
from redis import Redis

app = FastAPI(title="Video Portal API")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://vp_user:vp_pass@postgres:5432/video_portal")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


@app.get("/health")
def health():
    db_ok = False
    redis_ok = False

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        db_ok = True
    except Exception:
        db_ok = False

    try:
        client = Redis.from_url(REDIS_URL, decode_responses=True)
        redis_ok = client.ping()
    except Exception:
        redis_ok = False

    return {
        "status": "ok" if db_ok and redis_ok else "degraded",
        "time": datetime.utcnow().isoformat() + "Z",
        "postgres": db_ok,
        "redis": redis_ok,
    }


@app.get("/")
def root():
    return {"message": "Video portal starter is running"}

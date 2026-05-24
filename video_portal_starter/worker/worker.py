import os
import time
from datetime import datetime

from redis import Redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


def main():
    client = Redis.from_url(REDIS_URL, decode_responses=True)
    while True:
        payload = datetime.utcnow().isoformat() + "Z"
        client.set("vp:worker:last_heartbeat", payload)
        print(f"[worker] heartbeat {payload}", flush=True)
        time.sleep(5)


if __name__ == "__main__":
    main()

import os
import signal
import subprocess
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Video Ingest Service")

HLS_ROOT = Path(os.getenv("HLS_ROOT", "/data/hls"))
HLS_ROOT.mkdir(parents=True, exist_ok=True)


class StreamStartRequest(BaseModel):
    stream_id: str = Field(min_length=1, max_length=64)
    rtsp_url: str = Field(min_length=1)


class StreamInfo(BaseModel):
    stream_id: str
    status: str
    playlist: str
    pid: int | None = None


processes: Dict[str, subprocess.Popen] = {}


def _stream_dir(stream_id: str) -> Path:
    return HLS_ROOT / stream_id


def _playlist_path(stream_id: str) -> Path:
    return _stream_dir(stream_id) / "index.m3u8"


def _ffmpeg_cmd(stream_id: str, rtsp_url: str) -> list[str]:
    out_dir = _stream_dir(stream_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    return [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-rtsp_transport",
        "tcp",
        "-i",
        rtsp_url,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-tune",
        "zerolatency",
        "-f",
        "hls",
        "-hls_time",
        "2",
        "-hls_list_size",
        "6",
        "-hls_flags",
        "delete_segments+append_list",
        str(_playlist_path(stream_id)),
    ]


@app.get("/health")
def health():
    return {"status": "ok", "active_streams": len(processes)}


@app.get("/streams")
def list_streams():
    items = []
    for stream_id, proc in list(processes.items()):
        running = proc.poll() is None
        if not running:
            processes.pop(stream_id, None)
        items.append(
            StreamInfo(
                stream_id=stream_id,
                status="running" if running else "stopped",
                playlist=f"/hls/{stream_id}/index.m3u8",
                pid=proc.pid if running else None,
            )
        )
    return items


@app.post("/streams/start")
def start_stream(payload: StreamStartRequest):
    existing = processes.get(payload.stream_id)
    if existing and existing.poll() is None:
        raise HTTPException(status_code=409, detail="Stream already running")

    cmd = _ffmpeg_cmd(payload.stream_id, payload.rtsp_url)
    proc = subprocess.Popen(cmd)
    processes[payload.stream_id] = proc
    return StreamInfo(
        stream_id=payload.stream_id,
        status="starting",
        playlist=f"/hls/{payload.stream_id}/index.m3u8",
        pid=proc.pid,
    )


@app.post("/streams/{stream_id}/stop")
def stop_stream(stream_id: str):
    proc = processes.get(stream_id)
    if not proc:
        raise HTTPException(status_code=404, detail="Stream not found")

    if proc.poll() is None:
        proc.send_signal(signal.SIGTERM)
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    processes.pop(stream_id, None)
    return {"stream_id": stream_id, "status": "stopped"}

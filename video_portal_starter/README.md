# Video Portal Starter

## Start

```powershell
docker compose up -d --build
```

## Check

```powershell
docker compose ps
curl http://localhost:8000/health
curl http://localhost:8010/health
```

## Ingest (RTSP -> HLS)

List streams:

```powershell
curl http://localhost:8010/streams
```

Start stream:

```powershell
curl -X POST http://localhost:8010/streams/start ^
  -H "Content-Type: application/json" ^
  -d "{\"stream_id\":\"cam1\",\"rtsp_url\":\"rtsp://USER:PASS@192.168.1.10:554/stream1\"}"
```

Stop stream:

```powershell
curl -X POST http://localhost:8010/streams/cam1/stop
```

HLS output in container volume path:

`/data/hls/<stream_id>/index.m3u8`

## Stop

```powershell
docker compose down
```

#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update -y
sudo apt-get install -y libdrogon-dev cmake g++ libjsoncpp-dev libsdl2-dev

SRC="/home/pi/inFight/artifacts/crossing-detector-frontend-src/jsm.crossing-detector-front/CrossingReader/crossing.cpp"
python3 - <<'PY'
from pathlib import Path
p=Path('/home/pi/inFight/artifacts/crossing-detector-frontend-src/jsm.crossing-detector-front/CrossingReader/crossing.cpp')
s=p.read_text()
s=s.replace('LOG("No relay gpio");\n\t\tthrow -1;','LOG("No relay gpio, continue without relay");')
p.write_text(s)
print('patched crossing.cpp')
PY

grep -n "No relay gpio" "$SRC" | head -n 3 || true

BUILD="/home/pi/inFight/artifacts/crossing-detector-frontend-src/build_pi"
cmake -S /home/pi/inFight/artifacts/crossing-detector-frontend-src -B "$BUILD"
cmake --build "$BUILD" -j4
sudo install -m 755 "$BUILD/jsm.crossing-detector-front/jsm.crossing-detector-front" /opt/inflight/bins/jsm.crossing-detector-front

sudo install -m 644 /home/pi/inFight/artifacts/runtime_from_old_pi/opt/inflight/bins/detectorConfig.json /opt/inflight/bins/detectorConfig.json

for f in \
  /home/pi/inFight/src_frontend/server/routes/bluetooth.js \
  /home/pi/inFight/src_frontend/server/routes/tournaments.js \
  /home/pi/inFight/src_frontend/server/routes/longpoll.js \
  /home/pi/inFight/src_frontend/server/routes/teams.js \
  /home/pi/inFight/src_frontend/server/routes/disciplines.js \
  /home/pi/inFight/src_frontend/server/routes/stages.js; do
  [ -f "$f" ] && sed -i 's#127.0.0.1:15010#127.0.0.1:15000#g' "$f"
done

sudo mkdir -p /opt/inflight/frontend
sudo ln -sfn /home/pi/inFight/src_frontend/server /opt/inflight/frontend/server

sudo systemctl restart inflight-core inflight-server inflight-crossfront
sleep 6
systemctl is-active inflight-core inflight-server inflight-crossfront || true
sudo journalctl -u inflight-crossfront -n 80 --no-pager || true
curl -sS -m 8 -i http://127.0.0.1:3001/tournaments/getall | head -n 14 || true
/home/pi/inFight/scripts/verify_clean_pi.sh || true
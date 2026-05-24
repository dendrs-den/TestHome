#!/usr/bin/env bash
set -euo pipefail

# 1) fix server hardcoded api port
for f in \
  /home/pi/inFight/src_frontend/server/routes/bluetooth.js \
  /home/pi/inFight/src_frontend/server/routes/tournaments.js \
  /home/pi/inFight/src_frontend/server/routes/longpoll.js \
  /home/pi/inFight/src_frontend/server/routes/teams.js \
  /home/pi/inFight/src_frontend/server/routes/disciplines.js \
  /home/pi/inFight/src_frontend/server/routes/stages.js; do
  [ -f "$f" ] && sed -i 's#127.0.0.1:15010#127.0.0.1:15000#g' "$f"
done

# 2) patch crossfront relay fail behavior
SRC="/home/pi/inFight/artifacts/crossing-detector-frontend-src/jsm.crossing-detector-front/CrossingReader/crossing.cpp"
if [ -f "$SRC" ]; then
  perl -0777 -i -pe 's/LOG\("No relay gpio"\);\s*throw -1;/LOG("No relay gpio, continue without relay");/g' "$SRC"
fi

# 3) build crossfront
sudo apt-get update -y
sudo apt-get install -y cmake g++ libjsoncpp-dev libsdl2-dev
BUILD="/home/pi/inFight/artifacts/crossing-detector-frontend-src/build_pi"
cmake -S /home/pi/inFight/artifacts/crossing-detector-frontend-src -B "$BUILD"
cmake --build "$BUILD" -j4
sudo install -m 755 "$BUILD/jsm.crossing-detector-front/jsm.crossing-detector-front" /opt/inflight/bins/jsm.crossing-detector-front

# 4) ensure detector config exists
if [ -f /home/pi/inFight/artifacts/runtime_from_old_pi/opt/inflight/bins/detectorConfig.json ]; then
  sudo install -m 644 /home/pi/inFight/artifacts/runtime_from_old_pi/opt/inflight/bins/detectorConfig.json /opt/inflight/bins/detectorConfig.json
fi

# 5) ensure server working dir exists
sudo mkdir -p /opt/inflight/frontend
sudo ln -sfn /home/pi/inFight/src_frontend/server /opt/inflight/frontend/server

# 6) restart real stack
sudo systemctl daemon-reload
sudo systemctl restart inflight-core inflight-server inflight-crossfront
sleep 6

# 7) show diagnostics
systemctl is-active inflight-core inflight-server inflight-crossfront || true
sudo journalctl -u inflight-core -n 40 --no-pager || true
sudo journalctl -u inflight-crossfront -n 60 --no-pager || true
curl -sS -m 8 -i http://127.0.0.1:3001/tournaments/getall | head -n 20 || true
/home/pi/inFight/scripts/verify_clean_pi.sh || true
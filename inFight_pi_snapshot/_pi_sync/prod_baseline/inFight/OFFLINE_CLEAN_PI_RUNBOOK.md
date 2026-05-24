# inFlight Offline Install (Clean Raspberry Pi)

## Scope
This runbook is for isolated networks (no internet, no external DB).

## 1. Prepare on workstation (once)
- Copy project folder to USB: `inFight_pi_snapshot`.
- Ensure these artifacts exist:
- `artifacts/core/main`
- `artifacts/core/config.json`
- `artifacts/bins/jsm.crossing-detector-front`
- `artifacts/bins/jsm.bluetooth` (optional)
- `artifacts/crossing_stack_runtime/lib_modules/kernel/drivers/misc/crossing_detector.ko` (or source/build script)

## 2. Copy to Pi
```bash
rsync -av /media/usb/inFight_pi_snapshot/ pi@<pi-ip>:/home/pi/inFight/
```

## 3. Bootstrap in offline mode
```bash
cd /home/pi/inFight
chmod +x scripts/*.sh
./scripts/bootstrap_fresh_pi.sh --offline
```

Fast path (recommended):
```bash
cd /home/pi/inFight
chmod +x scripts/offline_real_install.sh
./scripts/offline_real_install.sh
```

Production path (clean install + formal PASS/FAIL report):
```bash
cd /home/pi/inFight
chmod +x scripts/install_clean_pi.sh scripts/verify_clean_pi.sh
./scripts/install_clean_pi.sh
```

## 4. Select real hardware mode
```bash
echo 'MODE=REAL' | sudo tee /etc/default/infight-mode
sudo systemctl restart infight-mode.service
```

## 5. Sensor and service checks
```bash
/home/pi/inFight/scripts/mode_status.sh
ls -l /dev/crossing_detector
sudo systemctl status inflight-crossfront --no-pager -l
sudo journalctl -u inflight-crossfront -n 100 --no-pager
curl -sS http://127.0.0.1:3001/tournaments/getall
```

Expected:
- `inflight-crossfront` = active
- `/dev/crossing_detector` exists
- crossfront log contains successful reader init
- API on `:3001` responds (not timeout)

## 6. If sensor is not detected
```bash
uname -r
lsmod | grep crossing_detector || true
sudo modprobe crossing_detector || sudo insmod /lib/modules/$(uname -r)/extra/crossing_detector.ko
sudo dmesg | tail -n 120
```

## 7. Notes for next clean install
- Keep Node preinstalled in base Pi image for offline use.
- Keep all required binaries in repository `artifacts/`.
- Avoid Mongo dependency for isolated deployment target.
- Optional remote one-command launcher from Windows:
- `scripts/run_offline_real_install.ps1`
- `scripts/run_clean_pi_install.ps1`

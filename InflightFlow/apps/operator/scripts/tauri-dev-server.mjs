import http from "node:http";
import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 5188;

function canConnect() {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: "/", timeout: 800 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

const alreadyUp = await canConnect();
if (alreadyUp) {
  console.log(`Dev server already running on http://${host}:${port}`);
  process.exit(0);
}

const child = spawn("npm.cmd", ["run", "dev", "--", "--host", host, "--port", String(port), "--strictPort"], {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 0));

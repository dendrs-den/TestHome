import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isRaspberryRuntime = process.platform === "linux" && process.arch === "arm64";
  const autoTarget = isRaspberryRuntime
    ? "http://127.0.0.1:18080"
    : "http://127.0.0.1:8080";
  const target = env.VITE_CORE_PROXY_TARGET || autoTarget;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/health": { target, changeOrigin: true },
        "/v1": { target, changeOrigin: true },
        "/debug": { target, changeOrigin: true },
        "/actions": { target, changeOrigin: true },
        "/tournaments": { target, changeOrigin: true },
        "/teams": { target, changeOrigin: true },
        "/stages": { target, changeOrigin: true },
        "/disciplines": { target, changeOrigin: true },
      },
    }
  };
});

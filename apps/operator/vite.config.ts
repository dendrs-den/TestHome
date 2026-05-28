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
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern",
        },
        sass: {
          api: "modern",
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@mui/x-data-grid")) return "mui-data-grid";
            if (id.includes("@mui/icons-material")) return "mui-icons";
            if (id.includes("@mui/material") || id.includes("@emotion")) return "mui-core";
            if (id.includes("react-router")) return "router";
            if (id.includes("socket.io-client")) return "socket-io";
            if (
              id.includes("/react/") ||
              id.includes("\\react\\") ||
              id.includes("/react-dom/") ||
              id.includes("\\react-dom\\") ||
              id.includes("/scheduler/") ||
              id.includes("\\scheduler\\")
            ) {
              return "react-vendor";
            }
          },
        },
      },
    },
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

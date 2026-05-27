const coreBaseUrl =
  (import.meta as any)?.env?.VITE_CORE_PROXY_TARGET || "http://127.0.0.1:8080";

export default coreBaseUrl;


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, Vite proxies API and WebSocket traffic to Django on :8000,
// so the browser sees a single origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
});

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/server/reports/**"],
      interval: 500,
      usePolling: true
    },
    proxy: {
      "/api": "http://localhost:4000",
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true
      }
    }
  }
});

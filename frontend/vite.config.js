import { defineConfig } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const proxyOptions = {
  target: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
  changeOrigin: false,
  secure: true,
  ws: false,
};

// New proxy options for Instagram-related endpoints
const localProxyOptions = {
  target: process.env.VITE_HOST_URL, // Your local server port
  changeOrigin: true,
  secure: false,
};

const host = process.env.HOST
  ? process.env.HOST.replace(/https?:\/\//, "")
  : "localhost";



let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: process.env.FRONTEND_PORT,
    clientPort: 443,
  };
}

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  envDir: '../',
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: 'public/dist'
  },
  server: {
    host: "localhost",
    port: process.env.FRONTEND_PORT,
    proxy: {
      "^/(\\?.*)?$": proxyOptions,
      "^/api(/|(\\?.*)?$)": proxyOptions,
      "^/fp(/|(\\?.*)?$)": proxyOptions,
      "^/adm(/|(\\?.*)?$)": proxyOptions,
      "^/publish": localProxyOptions,
      "^/api/instagram/post": localProxyOptions
    },
  },
});
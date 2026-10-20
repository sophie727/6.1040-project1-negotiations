import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

/** The API server, which `bun run dev` in the repository's root starts. */
const backend = "http://localhost:3141";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // As the server does, so a browser on /auth/commons/callback?code=… sends no Referer header with the code in it.
    headers: { "Referrer-Policy": "no-referrer" },
    proxy: { "/api": backend },
  },
});

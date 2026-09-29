import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  // مهم: برای GitHub Pages با آدرس amlakdot.github.io/GRAMCOIN/
  base: "/GRAMCOIN/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/tg-api": {
        target: "https://api.telegram.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tg-api/, ""),
      },
    },
  },
});

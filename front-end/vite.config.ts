import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: true,
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5050",
      },
      "/hubs": {
        target: "http://localhost:5050",
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-router",
      "@tanstack/react-query",
      "lucide-react",
      "recharts",
      "clsx",
      "class-variance-authority",
      "tailwind-merge",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-switch",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-slot",
      "@radix-ui/react-label",
      "@radix-ui/react-toggle",
      "@radix-ui/react-separator",
    ],
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons/systemic-192.png",
        "icons/systemic-512.png",
        "icons/systemic-maskable-512.png",
      ],
      manifest: {
        name: "Systemic",
        short_name: "Systemic",
        lang: "pt-BR",
        description: "Sistema de gerenciamento de restaurantes",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#111827",
        theme_color: "#111827",
        icons: [
          {
            src: "/icons/systemic-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/systemic-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/systemic-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{html,js,css,svg,png,woff2,ico}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));

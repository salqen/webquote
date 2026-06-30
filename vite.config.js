import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // Zvýši limit veľkosti chunks — JSX je veľký single-file
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 3000,
  },
});

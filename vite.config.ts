import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // shadcn/radix files start with "use client" (a Next.js hint); Vite ignores it safely.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" || warning.code === "SOURCEMAP_ERROR") return;
        warn(warning);
      },
    },
  },
});

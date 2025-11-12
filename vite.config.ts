import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Sitemap generation moved to postbuild script for better reliability
// This plugin is kept for potential future use but currently does nothing
function staticPageGenerator(): Plugin {
  return {
    name: "static-page-generator",
    async closeBundle() {
      // Sitemap generation now handled by standalone script in postbuild
      // This prevents build timeouts and ensures reliable generation
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    staticPageGenerator()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

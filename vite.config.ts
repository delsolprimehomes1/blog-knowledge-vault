import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Static page generator for blog articles - generates HTML files during build
// This ensures all published articles have pre-rendered HTML with correct schemas
function staticPageGenerator(): Plugin {
  return {
    name: "static-page-generator",
    async closeBundle() {
      if (process.env.NODE_ENV === 'production') {
        try {
          console.log('\n📄 Generating static pages...');
          const { generateStaticPages } = await import('./scripts/generateStaticPages.js');
          const distDir = path.resolve(__dirname, './dist');
          await generateStaticPages(distDir);
          console.log('✅ Static pages generated successfully\n');
        } catch (error) {
          console.error('⚠️  Static page generation failed:', error);
          // Don't fail the build, just log the error
        }
      }
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

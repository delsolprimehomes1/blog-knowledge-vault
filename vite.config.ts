import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Plugin to generate sitemap after build (static pages temporarily disabled for performance)
function staticPageGenerator(): Plugin {
  return {
    name: "static-page-generator",
    async closeBundle() {
      // Only run in production builds
      if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        
        // TEMPORARILY DISABLED: Static page generation (causes build timeouts)
        // console.log('\n📄 Generating static pages...');
        // try {
        //   const { generateStaticPages } = await import('./scripts/generateStaticPages');
        //   await generateStaticPages(distPath);
        // } catch (err) {
        //   console.error('Failed to generate static pages:', err);
        // }
        
        console.log('\n🗺️  Generating sitemap...');
        try {
          const { generateSitemap } = await import('./scripts/generateSitemap');
          await generateSitemap(distPath);
        } catch (err) {
          console.error('Failed to generate sitemap:', err);
          // Don't fail the build if sitemap generation fails
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

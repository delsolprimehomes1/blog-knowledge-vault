#!/usr/bin/env node
import { generateSitemap } from './generateSitemap.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = resolve(__dirname, '../dist');

console.log('\n🚀 Running standalone sitemap generation...');
console.log(`📂 Target directory: ${distPath}\n`);

generateSitemap(distPath)
  .then(() => {
    console.log('\n🎉 Sitemap generation complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sitemap generation failed:', error);
    process.exit(1);
  });

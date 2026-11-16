import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Bundles the entire EcoPulse dashboard into a single self-contained index.html
 * using classic IIFE <script> and inline <style> so it opens cleanly via file://
 * without needing any web server or CORS workarounds.
 */
function singleFilePortablePlugin(): Plugin {
  return {
    name: 'ecopulse-singlefile-portable',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = Object.values(bundle).find(
        (item) => item.type === 'asset' && item.fileName.endsWith('.html')
      );
      if (!htmlAsset || htmlAsset.type !== 'asset') return;

      let cssCode = '';
      let jsCode = '';

      for (const [key, item] of Object.entries(bundle)) {
        if (item.type === 'asset' && key.endsWith('.css')) {
          cssCode += String(item.source);
          delete bundle[key];
        } else if (item.type === 'chunk' && key.endsWith('.js')) {
          jsCode += item.code;
          delete bundle[key];
        }
      }

      let html = String(htmlAsset.source);
      // Remove external module script & stylesheet tags emitted by Vite
      html = html.replace(/<script\b[^>]*src="[^"]*"[^>]*><\/script>\s*/gi, '');
      html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>\s*/gi, '');

      // Inject inline CSS into <head> and inline classic IIFE JS before </body>
      html = html.replace('</head>', () => `<style>${cssCode}</style>\n</head>`);
      html = html.replace('</body>', () => `<script>\n${jsCode}\n</script>\n</body>`);

      htmlAsset.source = html;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), singleFilePortablePlugin()],
  build: {
    outDir: 'portable',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rolldownOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
        assetFileNames: 'bundle.[ext]',
      },
    },
  },
});

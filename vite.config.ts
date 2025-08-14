import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    basicSsl({
      /** name of certification */
      name: 'test'
      /** custom trust domains */
     // domains: ['*.custom.com'],
      /** custom certification directory */
      //certDir: '/Users/.../.devServer/cert',
    }),
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  // Base public path when served in development or built in production
  base: '/M3U8-editor/'
   
}));

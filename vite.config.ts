import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
//import basicSsl from '@vitejs/plugin-basic-ssl'
//import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
 /*
  preview: {
    https: {
      key: fs.readFileSync('./cert/server.key'), // Path to your private key file
      cert: fs.readFileSync('./cert/server.crt'), // Path to your certificate file
    },
  },
  */
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
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

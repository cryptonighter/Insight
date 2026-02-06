import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': 'http://localhost:3001'
      }
    },
    plugins: [react()],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_RESEMBLE_API_KEY': JSON.stringify(env.VITE_RESEMBLE_API_KEY || process.env.VITE_RESEMBLE_API_KEY),
      'process.env.VITE_RESEMBLE_VOICE_UUID': JSON.stringify(env.VITE_RESEMBLE_VOICE_UUID || process.env.VITE_RESEMBLE_VOICE_UUID),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

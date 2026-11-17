import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';

const FIREBASE_KEYS = {
  VITE_FIREBASE_API_KEY: 'apiKey',
  VITE_FIREBASE_AUTH_DOMAIN: 'authDomain',
  VITE_FIREBASE_PROJECT_ID: 'projectId',
  VITE_FIREBASE_STORAGE_BUCKET: 'storageBucket',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  VITE_FIREBASE_APP_ID: 'appId',
  VITE_FIREBASE_DATABASE_ID: 'firestoreDatabaseId',
  VITE_FIREBASE_MEASUREMENT_ID: 'measurementId',
} as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // In locale (es. AI Studio) la configurazione può arrivare da firebase-applet-config.json.
  let localConfig: Record<string, string> = {};
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      localConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.error('firebase-applet-config.json non valido', e);
    }
  }

  const define = Object.fromEntries(
    Object.entries(FIREBASE_KEYS).map(([envKey, jsonKey]) => [
      `import.meta.env.${envKey}`,
      JSON.stringify(env[envKey] || localConfig[jsonKey] || ''),
    ]),
  );

  define['import.meta.env.VITE_USE_EMULATORS'] = JSON.stringify(env.VITE_USE_EMULATORS || '');

  return {
    base: '/grest_oppeano/',
    plugins: [react(), tailwindcss()],
    define,
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['recharts'],
          },
        },
      },
    },
    server: {
      // In AI Studio l'HMR viene disattivato tramite DISABLE_HMR.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

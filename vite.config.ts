import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

export default defineConfig(() => {
  // Load Firebase Config dynamically at compile/build time
  let firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    databaseId: 'default'
  };

  try {
    const configPath = path.resolve(__dirname, './firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      firebaseConfig = {
        apiKey: content.apiKey || '',
        authDomain: content.authDomain || '',
        projectId: content.projectId || '',
        storageBucket: content.storageBucket || '',
        messagingSenderId: content.messagingSenderId || '',
        appId: content.appId || '',
        databaseId: content.firestoreDatabaseId || 'default'
      };
    }
  } catch (error) {
    console.warn('Could not load firebase-applet-config.json:', error);
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Safely inject values into client-side environment at compilation
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId),
      'import.meta.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.databaseId)
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

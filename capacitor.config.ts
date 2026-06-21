import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.centuryscorer.matchapp',
  appName: 'CenturyScorer Match Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

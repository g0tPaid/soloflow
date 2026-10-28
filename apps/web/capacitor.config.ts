import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://soloflow.practicalthings.store';

const config: CapacitorConfig = {
  appId: 'com.soloflow.app',
  appName: 'SoloFlow',
  webDir: 'www',
  android: {
    allowMixedContent: serverUrl.startsWith('http://'),
  },
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
  },
};

export default config;

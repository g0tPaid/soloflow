import type { CapacitorConfig } from '@capacitor/cli';

// Set when building APK: CAPACITOR_SERVER_URL=http://YOUR-PC-IP:3000
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.soloflow.app',
  appName: 'SoloFlow',
  webDir: 'www',
  android: {
    allowMixedContent: true,
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
        },
      }
    : {}),
};

export default config;

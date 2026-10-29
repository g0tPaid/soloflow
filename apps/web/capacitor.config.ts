import type { CapacitorConfig } from '@capacitor/cli';

/** Live SoloFlow web app. The APK is a shell around this origin; the Nest API stays behind it. */
export const PRODUCTION_SERVER_URL = 'https://soloflow.practicalthings.store';

// Local override: CAPACITOR_SERVER_URL=http://YOUR-PC-IP:3000
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim() || PRODUCTION_SERVER_URL;
const cleartext = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'store.practicalthings.soloflow',
  appName: 'SoloFlow',
  webDir: 'www',
  android: {
    allowMixedContent: cleartext,
  },
  server: {
    url: serverUrl,
    cleartext,
    androidScheme: 'https',
    allowNavigation: ['soloflow.practicalthings.store', '*.practicalthings.store', '*.up.railway.app'],
    // Shown only when the live site cannot be loaded and the service worker has nothing cached yet.
    errorPath: 'index.html',
  },
};

export default config;

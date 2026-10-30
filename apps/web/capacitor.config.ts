import type { CapacitorConfig } from '@capacitor/cli';

/** Live SoloFlow web app. The APK is a shell around this origin; the Nest API stays behind it. */
export const PRODUCTION_SERVER_URL = 'https://soloflow.practicalthings.store';

// Local override: CAPACITOR_SERVER_URL=http://YOUR-PC-IP:3000
const serverOrigin = (process.env.CAPACITOR_SERVER_URL?.trim() || PRODUCTION_SERVER_URL).replace(/\/$/, '');
// Cold start must request a real document. The origin root only redirects, and
// Android will not replay that redirect from the service worker cache.
const serverUrl = serverOrigin.endsWith('/dashboard') ? serverOrigin : `${serverOrigin}/dashboard`;
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
    // Last resort after the service worker retry. The page is a different origin,
    // so it cannot read the cached shell; it sends the WebView back to /dashboard once.
    errorPath: 'index.html',
  },
};

export default config;

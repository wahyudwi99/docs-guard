import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wahyu.docsguard',
  appName: 'docs-guard',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_SERVER_CLIENT_ID_FROM_GOOGLE_CONSOLE.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wahyu.docsguard',
  appName: 'docs-guard',
  webDir: 'out',
  plugins: {
    SocialLogin: {
      google: {
        serverClientId: 'YOUR_SERVER_CLIENT_ID_FROM_GOOGLE_CONSOLE.apps.googleusercontent.com',
      },
    },
  },
};

export default config;

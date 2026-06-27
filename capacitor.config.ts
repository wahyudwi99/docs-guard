import type { CapacitorConfig } from '@capacitor/cli';
import fs from 'fs';
import path from 'path';

const config: CapacitorConfig = {
  appId: 'com.docsguard',
  appName: 'docs-guard',
  webDir: 'out',
  plugins: {
    SocialLogin: {
      google: {
        serverClientId: process.env.NEXT_PUBLIC_GOOGLE_SERVER_CLIENT_ID || '',
        iosClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''
      },
    },
    AdMob: {
      appId: process.env.NEXT_PUBLIC_GOOGLE_ADMOB_APP_ID || '',
    }
  },
};

export default config;
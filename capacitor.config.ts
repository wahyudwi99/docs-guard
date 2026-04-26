import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wahyu.docsguard',
  appName: 'docs-guard',
  webDir: 'out',
  plugins: {
    SocialLogin: {
      google: {
        serverClientId: '1031627117513-07m0g7c5o5ij8k7l79he83fkblfd4g6q.apps.googleusercontent.com',
        iosClientId: '1031627117513-v2uh5j60iodalgou66ighsc9ohivc7a8.apps.googleusercontent.com'
      },
    },
  },
};

export default config;
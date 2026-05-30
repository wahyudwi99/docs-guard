import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.docsguard',
  appName: 'docs-guard',
  webDir: 'out',
  plugins: {
    SocialLogin: {
      google: {
        serverClientId: '1002837023207-n0hgfsi8vu9u107bqvigiej06jbma312.apps.googleusercontent.com',
        iosClientId: '1002837023207-imr2p14jh9ni0chtv0r8vmveoe4dgdnb.apps.googleusercontent.com'
      },
    },
    AdMob: {
      appId: 'ca-app-pub-3940256099942544~1458002511', // Official Google iOS Test App ID
    }
  },
};

export default config;
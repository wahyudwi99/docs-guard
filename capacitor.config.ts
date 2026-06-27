import type { CapacitorConfig } from '@capacitor/cli';
import fs from 'fs';
import path from 'path';

// Helper to load environment variables from .env or .env.local
const loadEnv = () => {
  const paths = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
  ];

  const loaded: string[] = [];
  for (const envPath of paths) {
    if (fs.existsSync(envPath) && !loaded.includes(envPath)) {
      loaded.push(envPath);
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        
        const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value.trim();
        }
      });
    }
  }
};

loadEnv();

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
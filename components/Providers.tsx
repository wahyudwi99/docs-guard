"use client";

import { I18nProvider } from "@/hooks/useI18n";
import { ReactNode, useEffect } from "react";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { SessionProvider } from "next-auth/react";
import { Capacitor } from "@capacitor/core";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capgo/capacitor-social-login').then(({ SocialLogin }) => {
        SocialLogin.initialize({
          google: {
            webClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_SERVER_CLIENT_ID_FROM_GOOGLE_CONSOLE.apps.googleusercontent.com',
          },
        });
      });
    }
  }, []);

  return (
    <SessionProvider refetchInterval={30}>
      <SubscriptionProvider>
        <I18nProvider>
          {children}
        </I18nProvider>
      </SubscriptionProvider>
    </SessionProvider>
  );
}

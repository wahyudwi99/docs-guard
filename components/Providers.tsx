"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/hooks/useI18n";
import { ReactNode, useEffect } from "react";
import { initRevenueCat } from "@/lib/revenuecat";
import { SubscriptionProvider } from "@/hooks/useSubscription";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initRevenueCat();
  }, []);

  return (
    <SessionProvider>
      <SubscriptionProvider>
        <I18nProvider>
          {children}
        </I18nProvider>
      </SubscriptionProvider>
    </SessionProvider>
  );
}

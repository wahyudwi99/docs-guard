"use client";

import { I18nProvider } from "@/hooks/useI18n";
import { ReactNode, useEffect } from "react";
import { initRevenueCat } from "@/lib/revenuecat";
import { SubscriptionProvider } from "@/hooks/useSubscription";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initRevenueCat();
  }, []);

  return (
    <SubscriptionProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </SubscriptionProvider>
  );
}

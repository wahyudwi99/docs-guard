"use client";

import { I18nProvider } from "@/hooks/useI18n";
import { ReactNode } from "react";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: ReactNode }) {
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

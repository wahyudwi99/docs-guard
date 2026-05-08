"use client";

import { I18nProvider } from "@/hooks/useI18n";
import { ReactNode } from "react";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { AuthProvider } from "@/context/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <I18nProvider>
          {children}
        </I18nProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

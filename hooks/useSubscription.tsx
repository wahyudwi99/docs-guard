"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  subscriptionDaysLeft: number | null;
  packages: any[];
  subscribe: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Always true for testing Pro features
  const [isPro] = useState(true);
  const [loading] = useState(false);
  const [subscriptionDaysLeft] = useState<number | null>(null);
  const [packages] = useState<any[]>([]);

  const checkSubscriptionStatus = async () => {};
  const subscribe = async () => true;
  const restorePurchases = async () => true;

  const contextValue = {
    isPro,
    loading,
    subscriptionDaysLeft,
    packages,
    subscribe,
    restorePurchases,
    checkSubscriptionStatus
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

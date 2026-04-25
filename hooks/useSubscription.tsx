"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

const PRO_ENTITLEMENT_ID = 'pro';

// Types from RevenueCat to maintain type safety without direct top-level import
type PurchasesPackage = any;
type CustomerInfo = any;

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  subscriptionDaysLeft: number | null;
  packages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  subscribe: (rcPackage: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(process.env.NODE_ENV === 'development');
  const [loading, setLoading] = useState(process.env.NODE_ENV !== 'development');
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number | null>(process.env.NODE_ENV === 'development' ? 365 : null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const fetchOffering = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      // Use dynamic import for PACKAGE_TYPE if needed, or just use strings/numbers if known
      setPackages([
        { 
          identifier: 'weekly', 
          packageType: 'WEEKLY', 
          product: { title: 'Weekly Pro', priceString: '$2.99', description: 'Weekly subscription', currencyCode: 'USD', price: 2.99, identifier: 'weekly' } 
        } as any,
        { 
          identifier: 'monthly', 
          packageType: 'MONTHLY', 
          product: { title: 'Monthly Pro', priceString: '$6.99', description: 'Monthly subscription', currencyCode: 'USD', price: 6.99, identifier: 'monthly' } 
        } as any,
        { 
          identifier: 'yearly', 
          packageType: 'ANNUAL', 
          product: { title: 'Yearly Pro', priceString: '$29.99', description: 'Yearly subscription', currencyCode: 'USD', price: 29.99, identifier: 'yearly' } 
        } as any,
      ]);
      return;
    }

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      setIsPro(true);
      setSubscriptionDaysLeft(365);
      setLoading(false);
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      const mockPro = typeof window !== 'undefined' ? localStorage.getItem('mock_is_pro') === 'true' : false;
      setIsPro(mockPro);
      setLoading(false);
      return;
    }

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setIsPro(info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(async (rcPackage: PurchasesPackage) => {
    setLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsPro(true);
        if (typeof window !== 'undefined') localStorage.setItem('mock_is_pro', 'true');
        return true;
      }

      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const result = await Purchases.purchasePackage({ aPackage: rcPackage });
      setCustomerInfo(result.customerInfo);
      const active = result.customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
      setIsPro(active);
      return active;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Purchase failed:', error);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    setLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        setIsPro(true);
        if (typeof window !== 'undefined') localStorage.setItem('mock_is_pro', 'true');
        return true;
      }
      
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const active = info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
      setIsPro(active);
      return active;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffering();
    checkSubscriptionStatus();
  }, [fetchOffering, checkSubscriptionStatus]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || !Capacitor.isNativePlatform()) return;

    let callbackId: any;
    
    const setupListener = async () => {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        callbackId = await Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
          setIsPro(info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined);
        });
      } catch (e) {
        console.error("Failed to setup RC listener", e);
      }
    };

    setupListener();

    return () => {
      if (callbackId) {
        import('@revenuecat/purchases-capacitor').then(({ Purchases }) => {
          Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: callbackId });
        }).catch(e => console.error("Failed to remove RC listener", e));
      }
    };
  }, []);

  const contextValue = {
    isPro,
    loading,
    subscriptionDaysLeft,
    packages,
    customerInfo,
    subscribe,
    restorePurchases,
    checkSubscriptionStatus
  };

  return (
    <SubscriptionContext value={contextValue}>
      {children}
    </SubscriptionContext>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Purchases, PACKAGE_TYPE, PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const PRO_ENTITLEMENT_ID = 'pro';

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  packages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  subscribe: (rcPackage: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const fetchOffering = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setPackages([
        { 
          identifier: 'weekly', 
          packageType: PACKAGE_TYPE.WEEKLY, 
          product: { title: 'Weekly Pro', priceString: '$2.99', description: 'Weekly subscription', currencyCode: 'USD', price: 2.99, identifier: 'weekly' } 
        } as any,
        { 
          identifier: 'monthly', 
          packageType: PACKAGE_TYPE.MONTHLY, 
          product: { title: 'Monthly Pro', priceString: '$6.99', description: 'Monthly subscription', currencyCode: 'USD', price: 6.99, identifier: 'monthly' } 
        } as any,
        { 
          identifier: 'yearly', 
          packageType: PACKAGE_TYPE.ANNUAL, 
          product: { title: 'Yearly Pro', priceString: '$29.99', description: 'Yearly subscription', currencyCode: 'USD', price: 29.99, identifier: 'yearly' } 
        } as any,
      ]);
      return;
    }

    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      const mockPro = localStorage.getItem('mock_is_pro') === 'true';
      setIsPro(mockPro);
      setLoading(false);
      return;
    }

    try {
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
        localStorage.setItem('mock_is_pro', 'true');
        return true;
      }

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
        localStorage.setItem('mock_is_pro', 'true');
        return true;
      }
      
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
    if (!Capacitor.isNativePlatform()) return;

    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
      setIsPro(info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined);
    });

    return () => {
      // Cleanup if possible
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      isPro,
      loading,
      packages,
      customerInfo,
      subscribe,
      restorePurchases,
      checkSubscriptionStatus
    }}>
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

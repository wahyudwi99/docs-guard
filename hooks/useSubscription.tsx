"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from 'next-auth/react';
import { 
  Purchases, 
  LOG_LEVEL, 
  CustomerInfo, 
  PurchasesPackage, 
  PACKAGE_TYPE 
} from '@revenuecat/purchases-capacitor';

// RevenueCat Entitlement ID
const ENTITLEMENT_ID = 'pro';

interface RevenueCatProduct {
  title: string;
  priceString: string;
  identifier: string;
}

interface SubscriptionPackage {
  identifier: string;
  packageType: PACKAGE_TYPE | string;
  product: RevenueCatProduct;
  rawPackage?: PurchasesPackage;
}

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  subscriptionDaysLeft: number | null;
  packages: SubscriptionPackage[];
  subscribe: (pkg: SubscriptionPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);

  // Initialize RevenueCat
  useEffect(() => {
    const initPurchases = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        
        const apiKey = Capacitor.getPlatform() === 'ios' 
          ? (process.env.NEXT_PUBLIC_REVENUECAT_APPLE_KEY || "appl_placeholder")
          : (process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_KEY || "goog_placeholder");
        
        await Purchases.configure({ apiKey });

        // Synchronize App User ID with NextAuth session
        if (session?.user?.email) {
          await Purchases.logIn({ appUserID: session.user.email });
        }
      } catch (error) {
        console.error('RevenueCat initialization failed:', error);
      }
    };

    initPurchases();
  }, [session]);

  const fetchOffering = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setPackages([
        { 
          identifier: 'weekly', 
          packageType: PACKAGE_TYPE.WEEKLY,
          product: { title: 'Weekly Pro', priceString: '$2.99', identifier: 'pro_weekly' } 
        },
        { 
          identifier: 'monthly', 
          packageType: PACKAGE_TYPE.MONTHLY,
          product: { title: 'Monthly Pro', priceString: '$6.99', identifier: 'pro_monthly' } 
        },
        { 
          identifier: 'yearly', 
          packageType: PACKAGE_TYPE.ANNUAL,
          product: { title: 'Yearly Pro', priceString: '$29.99', identifier: 'pro_yearly' } 
        },
      ]);
      return;
    }

    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        const mappedPackages: SubscriptionPackage[] = offerings.current.availablePackages.map(pkg => ({
          identifier: pkg.identifier,
          packageType: pkg.packageType,
          product: {
            title: pkg.product.title,
            priceString: pkg.product.priceString,
            identifier: pkg.product.identifier
          },
          rawPackage: pkg
        }));
        setPackages(mappedPackages);
      }
    } catch (error) {
      console.error('Error fetching RevenueCat offerings:', error);
    }
  }, []);

  const updateProStatus = (customerInfo: CustomerInfo) => {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    const active = !!entitlement;
    setIsPro(active);

    if (active && entitlement.expirationDate) {
      const expiry = new Date(entitlement.expirationDate);
      const now = new Date();
      const diffTime = Math.abs(expiry.getTime() - now.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setSubscriptionDaysLeft(diffDays);
    } else {
      setSubscriptionDaysLeft(null);
    }
  };

  const checkSubscriptionStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      const mockPro = typeof window !== 'undefined' && localStorage.getItem('mock_is_pro') === 'true';
      setIsPro(mockPro);
      setSubscriptionDaysLeft(mockPro ? 365 : 0);
      setLoading(false);
      return;
    }

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      updateProStatus(customerInfo);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(async (pkg: SubscriptionPackage) => {
    if (!Capacitor.isNativePlatform()) {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsPro(true);
      if (typeof window !== 'undefined') localStorage.setItem('mock_is_pro', 'true');
      setLoading(false);
      return true;
    }

    if (!pkg.rawPackage) {
      console.error('Cannot subscribe: No raw package data available');
      return false;
    }

    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: pkg.rawPackage,
      });
      
      updateProStatus(customerInfo);
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
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
    if (!Capacitor.isNativePlatform()) {
      setLoading(true);
      setIsPro(true);
      if (typeof window !== 'undefined') localStorage.setItem('mock_is_pro', 'true');
      setLoading(false);
      return true;
    }

    setLoading(true);
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      updateProStatus(customerInfo);
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
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

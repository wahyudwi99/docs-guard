"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

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
  const { user, refreshProfile } = useAuth();
  
  // Base isPro on the user's Supabase profile
  const isPro = user?.is_pro || false;
  
  const [loading, setLoading] = useState(true);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number | null>(null);
  const [packages, setPackages] = useState<any[]>([
    { 
      identifier: 'weekly', 
      isMock: true,
      product: { title: 'Weekly Pro', priceString: '$1.99', description: 'Perfect for quick projects' } 
    },
    { 
      identifier: 'monthly', 
      isMock: true,
      product: { title: 'Monthly Pro', priceString: '$4.99', description: 'Most popular choice' } 
    },
    { 
      identifier: 'yearly', 
      isMock: true,
      product: { title: 'Yearly Pro', priceString: '$24.99', description: 'Best value - 60% OFF' } 
    }
  ]);

  const isInitialized = React.useRef(false);

  useEffect(() => {
    if (user?.id && !isInitialized.current) {
      initRevenueCat();
      isInitialized.current = true;
    }
  }, [user?.id]);

  const initRevenueCat = async () => {
    try {
      setLoading(true);
      if (Capacitor.isNativePlatform()) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        
        // Use placeholders or env vars for the keys
        if (Capacitor.getPlatform() === 'ios') {
          await Purchases.configure({ apiKey: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || 'YOUR_REVENUECAT_IOS_KEY' });
        } else if (Capacitor.getPlatform() === 'android') {
          await Purchases.configure({ apiKey: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || 'YOUR_REVENUECAT_ANDROID_KEY' });
        }

        if (user?.id) {
          await Purchases.logIn({ appUserID: user.id });
        }

        await fetchPackages();
        await checkSubscriptionStatus();
      } else {
        // Mock packages for web development with sensible tiered pricing
        setPackages([
          { 
            identifier: 'weekly', 
            product: { title: 'Weekly Pro', priceString: '$1.99', description: 'Perfect for quick projects' } 
          },
          { 
            identifier: 'monthly', 
            product: { title: 'Monthly Pro', priceString: '$4.99', description: 'Most popular choice' } 
          },
          { 
            identifier: 'yearly', 
            product: { title: 'Yearly Pro', priceString: '$24.99', description: 'Best value - 60% OFF' } 
          }
        ]);
        setLoading(false);
      }
    } catch (error) {
      console.error("RevenueCat Init Error:", error);
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    const mockPackages = [
      { 
        identifier: 'weekly', 
        isMock: true,
        product: { title: 'Weekly Pro', priceString: '$1.99', description: 'Perfect for quick projects' } 
      },
      { 
        identifier: 'monthly', 
        isMock: true,
        product: { title: 'Monthly Pro', priceString: '$4.99', description: 'Most popular choice' } 
      },
      { 
        identifier: 'yearly', 
        isMock: true,
        product: { title: 'Yearly Pro', priceString: '$24.99', description: 'Best value - 60% OFF' } 
      }
    ];

    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
      } else {
        setPackages(mockPackages);
      }
    } catch (error) {
      console.error("Error fetching packages, using mocks", error);
      setPackages(mockPackages);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if (!Capacitor.isNativePlatform() || !user?.id) return;
      
      const { customerInfo } = await Purchases.getCustomerInfo();
      const isActive = typeof customerInfo.entitlements.active['pro'] !== "undefined";
      
      // Sync status with Supabase based on RevenueCat truth
      if (isActive && !isPro) {
        console.log("[SUBSCRIPTION] Syncing: Becoming PRO");
        await syncPurchaseToSupabase(null, true);
      } else if (!isActive && isPro) {
        console.log("[SUBSCRIPTION] Syncing: Subscription EXPIRED. Removing PRO status.");
        await syncPurchaseToSupabase(null, false);
      }
    } catch (error) {
      console.error("Error checking status", error);
    } finally {
      setLoading(false);
    }
  };

  const syncPurchaseToSupabase = async (transactionId: string | null, active: boolean) => {
    if (!user?.id) return;

    try {
      // 1. Update ONLY the user's PRO status (always do this on sync)
      const { error: userError } = await supabase
        .from('users')
        .update({ is_pro: active, updated_at: new Date().toISOString() })
        .eq('id', user.id);
        
      if (userError) throw userError;

      // 2. Log payment ONLY if we have a transactionId (means it's a NEW manual purchase)
      // and only if the status is active.
      if (transactionId && active) {
        console.log("[SUPABASE] Logging NEW transaction:", transactionId);
        await supabase
          .from('payments')
          .upsert({
            user_id: user.id,
            transaction_id: transactionId,
            status: 'completed',
            created_at: new Date().toISOString()
          }, { onConflict: 'transaction_id' });
      }
      
      await refreshProfile();
    } catch (error) {
      console.error("[SUPABASE] Sync failed:", error);
    }
  };

  const subscribe = async (pkg: any) => {
    try {
      if (isPro && !pkg.isMock) {
        console.log("[SUBSCRIPTION] User is already PRO. Checking if this package is already active...");
        // Optional: Show a message to user "You already have an active plan"
      }

      setLoading(true);
      
      // REAL native purchase using RevenueCat
      if (!pkg.isMock && Capacitor.isNativePlatform()) {
        console.log("Triggering REAL native purchase for:", pkg.identifier);
        const { customerInfo, productIdentifier } = await Purchases.purchasePackage({ aPackage: pkg });
        
        if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
          console.log("Purchase SUCCESSFUL for:", productIdentifier);
          // Only sync if there is a NEW transaction date or ID
          await syncPurchaseToSupabase(productIdentifier, true);
          return true;
        }
      } else {
        // Fallback for mock package (for testing UI/DB only)
        console.log("Simulating purchase for mock/web package:", pkg.identifier);
        await syncPurchaseToSupabase(`sim_tx_${Date.now()}`, true);
        return true;
      }
      
      return false;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Native Purchase Error:", error);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async () => {
    try {
      setLoading(true);
      if (!Capacitor.isNativePlatform()) return false;
      
      const { customerInfo } = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
        await syncPurchaseToSupabase(null, true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Restore error", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

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

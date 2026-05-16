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

  useEffect(() => {
    initRevenueCat();
  }, [user]);

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
      
      // If RevenueCat says they are active but our DB doesn't, sync it
      if (isActive && !isPro) {
        await syncPurchaseToSupabase(null, true);
      } else if (!isActive && isPro) {
        await syncPurchaseToSupabase(null, false);
      }
    } catch (error) {
      console.error("Error checking status", error);
    } finally {
      setLoading(false);
    }
  };

  const syncPurchaseToSupabase = async (transactionId: string | null, active: boolean) => {
    try {
      if (user?.id) {
        // Update user pro status in Supabase
        await supabase
          .from('users')
          .update({ is_pro: active, updated_at: new Date().toISOString() })
          .eq('id', user.id);
          
        if (transactionId && active) {
          // Log payment in Supabase
          await supabase
            .from('payments')
            .insert({
              user_id: user.id,
              transaction_id: transactionId,
              status: 'completed',
            });
        }
      } else if (user) {
        // Standalone test mode: update local preferences directly
        const updatedUser = { ...user, is_pro: active };
        await Preferences.set({
          key: 'docs_guard_auth_user',
          value: JSON.stringify(updatedUser),
        });
      }
      
      // Refresh local auth context
      await refreshProfile();
    } catch (error) {
      console.error("Error syncing purchase status", error);
    }
  };

  const subscribe = async (pkg: any) => {
    try {
      setLoading(true);
      if (!Capacitor.isNativePlatform()) {
        // Mock purchase for web
        await syncPurchaseToSupabase('mock_tx_123', true);
        return true;
      }
      
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage({ aPackage: pkg });
      
      if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
        await syncPurchaseToSupabase(productIdentifier, true);
        return true;
      }
      return false;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Purchase error", error);
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

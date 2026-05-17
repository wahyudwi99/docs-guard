"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  packages: any[];
  activeEntitlements: any[];
  subscribe: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [activeEntitlements, setActiveEntitlements] = useState<any[]>([]);
  
  // Single source of truth for PRO status is the user profile from Supabase
  const isPro = user?.is_pro || false;
  const isInitialized = useRef(false);

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
        if (Capacitor.getPlatform() === 'ios') {
          await Purchases.configure({ apiKey: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || 'YOUR_REVENUECAT_IOS_KEY' });
        }
        if (user?.id) {
          await Purchases.logIn({ appUserID: user.id });
        }
        await fetchPackages();
        await checkSubscriptionStatus();
      } else {
        // Mock data for web
        setPackages([
          { identifier: 'weekly', isMock: true, product: { title: 'Weekly Pro', priceString: '$1.99' } },
          { identifier: 'monthly', isMock: true, product: { title: 'Monthly Pro', priceString: '$4.99' } },
          { identifier: 'yearly', isMock: true, product: { title: 'Yearly Pro', priceString: '$24.99' } }
        ]);
        setLoading(false);
      }
    } catch (error) {
      console.error("RevenueCat Init Error:", error);
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error("Error fetching packages", error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if (!Capacitor.isNativePlatform() || !user?.id) return;
      
      const { customerInfo } = await Purchases.getCustomerInfo();
      const active = Object.values(customerInfo.entitlements.active);
      setActiveEntitlements(active);

      const isActive = active.length > 0;
      
      if (isActive) {
        // Sort by latest purchase date to get the "current" primary plan
        const sorted = [...active].sort((a, b) => 
          new Date(b.latestPurchaseDate).getTime() - new Date(a.latestPurchaseDate).getTime()
        );
        
        const primary = sorted[0];
        let subType = 'pro';
        if (primary.productIdentifier.toLowerCase().includes('weekly')) subType = 'weekly';
        else if (primary.productIdentifier.toLowerCase().includes('monthly')) subType = 'monthly';
        else if (primary.productIdentifier.toLowerCase().includes('yearly')) subType = 'yearly';

        await syncPurchaseToSupabase(null, true, subType, primary.expirationDate);
      } else if (isPro) {
        // No active entitlements but DB says Pro -> Sync to false
        await syncPurchaseToSupabase(null, false, null, null);
      }
    } catch (error) {
      console.error("Error checking status", error);
    } finally {
      setLoading(false);
    }
  };

  const syncPurchaseToSupabase = async (transactionId: string | null, active: boolean, type?: string | null, endDate?: string | null) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('users')
        .update({ 
          is_pro: active, 
          subscription_type: type,
          subscription_end_date: endDate,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (transactionId && active) {
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
      setLoading(true);
      if (!pkg.isMock && Capacitor.isNativePlatform()) {
        const { customerInfo, productIdentifier } = await Purchases.purchasePackage({ aPackage: pkg });
        const entitlement = customerInfo.entitlements.active['pro'];
        
        if (typeof entitlement !== "undefined") {
          let subType = 'monthly';
          if (pkg.identifier.toLowerCase().includes('weekly')) subType = 'weekly';
          else if (pkg.identifier.toLowerCase().includes('yearly')) subType = 'yearly';
          
          await syncPurchaseToSupabase(productIdentifier, true, subType, entitlement.expirationDate);
          return true;
        }
      } else {
        // Mock simulation
        const fakeExpiry = new Date();
        let subType = 'monthly';
        if (pkg.identifier.includes('weekly')) { fakeExpiry.setDate(fakeExpiry.getDate() + 7); subType = 'weekly'; }
        else if (pkg.identifier.includes('monthly')) { fakeExpiry.setMonth(fakeExpiry.getMonth() + 1); subType = 'monthly'; }
        else { fakeExpiry.setFullYear(fakeExpiry.getFullYear() + 1); subType = 'yearly'; }

        await syncPurchaseToSupabase(`sim_tx_${Date.now()}`, true, subType, fakeExpiry.toISOString());
        return true;
      }
      return false;
    } catch (error: any) {
      if (!error.userCancelled) console.error("Purchase Error:", error);
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
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        await checkSubscriptionStatus();
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

  return (
    <SubscriptionContext.Provider value={{ isPro, loading, packages, activeEntitlements, subscribe, restorePurchases, checkSubscriptionStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return context;
};

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from 'react';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

interface ActivePlan {
  type: string;
  endDate: string | null;
  productIdentifier: string;
}

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  packages: any[];
  activeEntitlements: any[];
  currentPlan: ActivePlan | null;
  subscribe: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [activeEntitlements, setActiveEntitlements] = useState<any[]>([]);
  
  const isInitialized = useRef(false);

  // SOURCE OF TRUTH: Directly and ONLY from RevenueCat active entitlements
  const isPro = activeEntitlements.length > 0;

  // Determine the primary active plan from RevenueCat state
  const currentPlan = useMemo(() => {
    if (activeEntitlements.length === 0) return null;

    console.log("[SUBSCRIPTION] Active Entitlements Raw:", JSON.stringify(activeEntitlements));

    // Sort by latest purchase date DESCENDING (newest first)
    const sorted = [...activeEntitlements].sort((a, b) => {
      const dateA = new Date(a.latestPurchaseDate || a.originalPurchaseDate || 0).getTime();
      const dateB = new Date(b.latestPurchaseDate || b.originalPurchaseDate || 0).getTime();
      
      console.log(`[SUBSCRIPTION] Comparing A: ${a.productIdentifier} (${dateA}) with B: ${b.productIdentifier} (${dateB})`);
      return dateB - dateA;
    });
    
    const primary = sorted[0];
    console.log("[SUBSCRIPTION] WINNER (Latest):", primary.productIdentifier);
    
    let subType = 'premium';
    const id = primary.productIdentifier.toLowerCase();
    if (id.includes('weekly')) subType = 'weekly';
    else if (id.includes('monthly')) subType = 'monthly';
    else if (id.includes('yearly')) subType = 'yearly';

    return {
      type: subType,
      endDate: primary.expirationDate,
      productIdentifier: primary.productIdentifier
    };
  }, [activeEntitlements]);

  useEffect(() => {
    // Always initialize to fetch packages
    if (!isInitialized.current) {
      initRevenueCat();
      isInitialized.current = true;
    } else if (user?.id) {
      syncUserWithRevenueCat();
    }
  }, [user?.id]);

  const syncUserWithRevenueCat = async () => {
    if (!Capacitor.isNativePlatform() || !user?.id) return;
    try {
      await Purchases.logIn({ appUserID: user.id });
      await checkSubscriptionStatus();
    } catch (e) {
      console.error("Error syncing user with RevenueCat:", e);
    }
  };

  const initRevenueCat = async () => {
    try {
      setLoading(true);
      
      if (Capacitor.isNativePlatform()) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        if (Capacitor.getPlatform() === 'ios') {
          await Purchases.configure({ apiKey: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || 'YOUR_REVENUECAT_IOS_KEY' });
        }

        await fetchPackages();

        if (user?.id) {
          await syncUserWithRevenueCat();
        } else {
          setLoading(false);
        }
      } else {
        // Mock data for web
        setPackages([
          { identifier: 'weekly', isMock: true, product: { title: 'Weekly Pro', priceString: '$1.99', description: 'Perfect for quick projects' } },
          { identifier: 'monthly', isMock: true, product: { title: 'Monthly Pro', priceString: '$4.99', description: 'Most popular choice' } },
          { identifier: 'yearly', isMock: true, product: { title: 'Yearly Pro', priceString: '$24.99', description: 'Best value - 60% OFF' } }
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
      { identifier: 'weekly', isMock: true, product: { title: 'Weekly Pro', priceString: '$1.99' } },
      { identifier: 'monthly', isMock: true, product: { title: 'Monthly Pro', priceString: '$4.99' } },
      { identifier: 'yearly', isMock: true, product: { title: 'Yearly Pro', priceString: '$24.99' } }
    ];

    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
      } else {
        setPackages(mockPackages);
      }
    } catch (error) {
      setPackages(mockPackages);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if (!Capacitor.isNativePlatform()) return;
      console.log("[SUBSCRIPTION] Checking latest status from RevenueCat...");
      const { customerInfo } = await Purchases.getCustomerInfo();
      const active = Object.values(customerInfo.entitlements.active);
      
      console.log(`[SUBSCRIPTION] Found ${active.length} active entitlements`);
      setActiveEntitlements(active);

      // If active list is empty, we must ensure local state reflects this
      if (active.length === 0) {
        console.log("[SUBSCRIPTION] No active plans detected. Status: FREE");
      }
    } catch (error) {
      console.error("Error checking status", error);
    } finally {
      setLoading(false);
    }
  };

  const logTransactionToSupabase = async (transactionId: string, productId: string) => {
    if (!user?.id) return;
    try {
      console.log("[SUPABASE] Logging transaction history...");
      await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          transaction_id: transactionId,
          product_id: productId,
          status: 'completed',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error("[SUPABASE] Logging failed:", error);
    }
  };

  const subscribe = async (pkg: any) => {
    try {
      setLoading(true);
      if (!pkg.isMock && Capacitor.isNativePlatform()) {
        const { customerInfo, productIdentifier } = await Purchases.purchasePackage({ aPackage: pkg });
        setActiveEntitlements(Object.values(customerInfo.entitlements.active));
        
        if (customerInfo.entitlements.active['pro']) {
          await logTransactionToSupabase(productIdentifier, pkg.identifier);
          return true;
        }
      } else {
        // Simulation for Mock
        console.log("Simulating purchase for:", pkg.identifier);
        // We only simulate the UI change locally for testing
        setActiveEntitlements([{
          productIdentifier: pkg.identifier,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          latestPurchaseDate: new Date().toISOString()
        }]);
        await logTransactionToSupabase(`sim_${Date.now()}`, pkg.identifier);
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
      setActiveEntitlements(Object.values(customerInfo.entitlements.active));
      return Object.keys(customerInfo.entitlements.active).length > 0;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider value={{ isPro, loading, packages, activeEntitlements, currentPlan, subscribe, restorePurchases, checkSubscriptionStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return context;
};

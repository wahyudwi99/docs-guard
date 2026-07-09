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
  trialActive: boolean;
  loading: boolean;
  packages: any[];
  activeEntitlements: any[];
  currentPlan: ActivePlan | null;
  subscriptionConflict: boolean;
  purchaseSuccess: boolean;
  eligibleForTrial: boolean;
  setPurchaseSuccess: (success: boolean) => void;
  subscribe: (pkg: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
  loginToRevenueCat: (userId: string) => Promise<void>;
  logoutFromRevenueCat: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [activeEntitlements, setActiveEntitlements] = useState<any[]>([]);
  const [latestPlanInfo, setLatestPlanInfo] = useState<ActivePlan | null>(null);
  const [subscriptionConflict, setSubscriptionConflict] = useState(false);
  const [purchaseSuccess, setPurchaseSuccessState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem('docsguard_purchase_success') === 'true';
    }
    return false;
  });
  const [hasPurchaseHistory, setHasPurchaseHistory] = useState(false);

  const setPurchaseSuccess = (val: boolean) => {
    setPurchaseSuccessState(val);
    if (val) {
      localStorage.setItem('docsguard_purchase_success', 'true');
    } else {
      localStorage.removeItem('docsguard_purchase_success');
    }
  };
  
  const isInitialized = useRef(false);
  const initialLoadDone = useRef(false);
  const initialActiveSubs = useRef<string[]>([]);
  const initialPro = useRef(false);

  // Check if active subscription is in native trial period (RevenueCat)
  const trialActive = useMemo(() => {
    return activeEntitlements.some((ent: any) => ent.periodType === 'TRIAL');
  }, [activeEntitlements]);

  // SOURCE OF TRUTH: PRO if user is logged in AND has active entitlements
  const isPro = useMemo(() => {
    return activeEntitlements.length > 0;
  }, [activeEntitlements]);

  const currentPlan = useMemo(() => {
    return latestPlanInfo;
  }, [latestPlanInfo]);

  const eligibleForTrial = useMemo(() => {
    return !isPro && !hasPurchaseHistory;
  }, [isPro, hasPurchaseHistory]);

  const initRevenueCat = async () => {
    try {
      setLoading(true);
      if (Capacitor.isNativePlatform()) {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        if (Capacitor.getPlatform() === 'ios') {
          await Purchases.configure({ apiKey: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || 'YOUR_REVENUECAT_IOS_KEY' });
        }
        
        await Purchases.addCustomerInfoUpdateListener((info) => {
          processCustomerInfo(info);
        });

        await fetchPackages();

        // If user is already logged in from previous session
        if (user?.id) {
          await loginToRevenueCat(user.id);
        } else {
          await checkSubscriptionStatus();
        }
      } else {
        // Professional default prices for web/unidentified users
        setPackages([
          { identifier: 'weekly', isMock: true, product: { identifier: 'weekly', title: 'Weekly Pro', priceString: '$2.99', description: 'Billed weekly' } },
          { identifier: 'monthly', isMock: true, product: { identifier: 'monthly', title: 'Monthly Pro', priceString: '$6.99', description: 'Most popular choice' } },
          { identifier: 'yearly', isMock: true, product: { identifier: 'yearly', title: 'Yearly Pro', priceString: '$27.99', description: 'Best value' } }
        ]);
        setLoading(false);
      }
    } catch (error) {
      console.error("RevenueCat Init Error:", error);
      setLoading(false);
    }
  };

  const loginToRevenueCat = async (userId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      console.log("[SUBSCRIPTION] Logging in to RevenueCat:", userId);
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });
      
      // CONFLICT DETECTION:
      // If the device has a purchase date but NO active entitlements for this user ID
      const hasPurchasesOnDevice = Object.keys(customerInfo.allPurchaseDates).length > 0;
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasPurchasesOnDevice && !hasActiveEntitlements) {
        console.warn("[SUBSCRIPTION] Conflict detected: Purchases exist on device but not for this user.");
        setSubscriptionConflict(true);
      } else {
        setSubscriptionConflict(false);
      }

      processCustomerInfo(customerInfo);
    } catch (e) {
      console.error("RevenueCat Login Error:", e);
    }
  };

  const logoutFromRevenueCat = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      console.log("[SUBSCRIPTION] Logging out from RevenueCat");
      await Purchases.logOut();
      setSubscriptionConflict(false);
      setActiveEntitlements([]);
      setLatestPlanInfo(null);
      setHasPurchaseHistory(false);
    } catch (e) {
      console.error("RevenueCat Logout Error:", e);
    }
  };

  useEffect(() => {
    if (!isInitialized.current) {
      initRevenueCat();
      isInitialized.current = true;
    } else if (user?.id) {
      // If already initialized but user just logged in, sync them
      initialLoadDone.current = false;
      loginToRevenueCat(user.id);
    } else if (!user && isInitialized.current) {
      // User logged out, clear RevenueCat session
      initialLoadDone.current = false;
      logoutFromRevenueCat();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user === null]);

  const fetchPackages = async () => {
    // Professional fallback packages
    const mockPackages = [
      { identifier: 'weekly', isMock: true, product: { identifier: 'weekly', title: 'Weekly Pro', priceString: '$2.99' } },
      { identifier: 'monthly', isMock: true, product: { identifier: 'monthly', title: 'Monthly Pro', priceString: '$6.99' } },
      { identifier: 'yearly', isMock: true, product: { identifier: 'yearly', title: 'Yearly Pro', priceString: '$27.99' } }
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

  const processCustomerInfo = (customerInfo: any) => {
    // 1. Update active entitlements list
    const activeEnts = Object.values(customerInfo.entitlements.active);
    setActiveEntitlements(activeEnts);

    // Check if user has any purchase history (indicating they've used a trial or subscribed before)
    const hasHistory = !!(customerInfo?.allPurchaseDates && Object.keys(customerInfo.allPurchaseDates).length > 0);
    setHasPurchaseHistory(hasHistory);

    // Identify the pro entitlement status
    const proEntitlement = customerInfo.entitlements.active['pro'];
    const isProNow = !!proEntitlement;

    // Detect if this is a new purchase or upgrade
    if (initialLoadDone.current) {
      const currentSubs = customerInfo.activeSubscriptions || [];
      const hasNewSub = currentSubs.some((sub: string) => !initialActiveSubs.current.includes(sub));
      const statusUpgraded = isProNow && !initialPro.current;
      
      if (statusUpgraded || hasNewSub) {
        console.log("[SUBSCRIPTION] New purchase or upgrade detected! Reloading page...");
        // Update refs to prevent reload loop
        initialActiveSubs.current = currentSubs;
        initialPro.current = isProNow;
        
        // Save success state to trigger splash transition on reload
        localStorage.setItem('docsguard_purchase_success', 'true');
        
        // Perform the reload
        window.location.reload();
        return;
      }
    } else {
      // First load: capture initial state
      initialLoadDone.current = true;
      initialActiveSubs.current = customerInfo.activeSubscriptions || [];
      initialPro.current = isProNow;
    }

    // 2. Identify the primary active subscription (the "Current Plan")
    // Use the 'pro' entitlement as the source of truth if it exists
    if (proEntitlement) {
      let productId = proEntitlement.productIdentifier;
      
      // Override productId if there are multiple active subscriptions (common in sandbox upgrades)
      if (customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0) {
        const activeSubs = customerInfo.activeSubscriptions;
        
        // Check if we have a locally stored last purchased product that is still active
        const lastPurchased = typeof window !== 'undefined' ? localStorage.getItem('docsguard_last_purchased_product') : null;
        
        if (lastPurchased && activeSubs.includes(lastPurchased)) {
          productId = lastPurchased;
        } else {
          // Fallback to latest purchase date comparison
          const purchaseDates = customerInfo.allPurchaseDates || {};
          let latestProductId = productId;
          let latestPurchaseTime = 0;
          
          activeSubs.forEach((id: string) => {
            const dateStr = purchaseDates[id];
            if (dateStr) {
              const time = new Date(dateStr).getTime();
              if (time > latestPurchaseTime) {
                latestPurchaseTime = time;
                latestProductId = id;
              }
            }
          });
          
          productId = latestProductId;
        }
      }
      
      let type = 'premium';
      const idLower = productId.toLowerCase();
      if (idLower.includes('weekly')) type = 'weekly';
      else if (idLower.includes('monthly')) type = 'monthly';
      else if (idLower.includes('yearly')) type = 'yearly';

      setLatestPlanInfo({
        type,
        endDate: proEntitlement.expirationDate || null,
        productIdentifier: productId
      });
    } else if (activeEnts.length > 0) {
      // Fallback to any active entitlement
      const firstEnt = activeEnts[0] as any;
      setLatestPlanInfo({
        type: 'premium',
        endDate: firstEnt.expirationDate || null,
        productIdentifier: firstEnt.productIdentifier
      });
    } else {
      setLatestPlanInfo(null);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if (!Capacitor.isNativePlatform()) return;
      const { customerInfo } = await Purchases.getCustomerInfo();
      processCustomerInfo(customerInfo);
    } catch (error) {
      console.error("Error checking status", error);
    } finally {
      setLoading(false);
    }
  };

  const logTransactionToSupabase = async (transactionId: string, productId: string) => {
    if (!user?.id) return;
    try {
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
      
      // Store the intended product identifier BEFORE calling native purchase
      // to prevent the native listener reload from race-canceling this state write
      const prodId = pkg.product?.identifier || pkg.identifier;
      if (prodId) {
        localStorage.setItem('docsguard_last_purchased_product', prodId);
      }

      if (!pkg.isMock && Capacitor.isNativePlatform()) {
        const { customerInfo, productIdentifier } = await Purchases.purchasePackage({ aPackage: pkg });
        processCustomerInfo(customerInfo);
        if (customerInfo.entitlements.active['pro']) {
          await logTransactionToSupabase(productIdentifier, pkg.identifier);
          setPurchaseSuccess(true);
          return true;
        }
      } else {
        // Mock
        const fakeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const mockInfo = {
          entitlements: { active: { pro: { productIdentifier: pkg.identifier, expirationDate: fakeExpiry, willRenew: true } } },
          activeSubscriptions: [pkg.identifier],
          allPurchaseDates: { [pkg.identifier]: new Date().toISOString() }
        };
        processCustomerInfo(mockInfo);
        await logTransactionToSupabase(`sim_${Date.now()}`, pkg.identifier);
        setPurchaseSuccess(true);
        return true;
      }
      return false;
    } catch (error: any) {
      // Clear the local state override if the purchase was cancelled or failed
      localStorage.removeItem('docsguard_last_purchased_product');
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
      
      // Clear last purchased on restore to let date/entitlement logic decide
      localStorage.removeItem('docsguard_last_purchased_product');
      
      const { customerInfo } = await Purchases.restorePurchases();
      processCustomerInfo(customerInfo);
      return Object.keys(customerInfo.entitlements.active).length > 0;
    } catch (error) {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider value={{ 
      isPro, 
      trialActive,
      loading, 
      packages, 
      activeEntitlements, 
      currentPlan, 
      subscriptionConflict,
      purchaseSuccess,
      eligibleForTrial,
      setPurchaseSuccess,
      subscribe, 
      restorePurchases, 
      checkSubscriptionStatus,
      loginToRevenueCat,
      logoutFromRevenueCat
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return context;
};

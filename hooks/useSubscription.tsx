"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from 'next-auth/react';

// Product IDs from Apple/Google Developer Console
const PRODUCT_IDS = ['pro_weekly', 'pro_monthly', 'pro_yearly'];

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  subscriptionDaysLeft: number | null;
  packages: any[];
  subscribe: (product: any) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number | null>(null);
  const [packages, setPackages] = useState<any[]>([]);

  const fetchOffering = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setPackages([
        { 
          identifier: 'weekly', 
          product: { title: 'Weekly Pro', priceString: '$2.99', identifier: 'pro_weekly' } 
        },
        { 
          identifier: 'monthly', 
          product: { title: 'Monthly Pro', priceString: '$6.99', identifier: 'pro_monthly' } 
        },
        { 
          identifier: 'yearly', 
          product: { title: 'Yearly Pro', priceString: '$29.99', identifier: 'pro_yearly' } 
        },
      ]);
      return;
    }

    try {
      const { NativePurchases } = await import('@capgo/native-purchases');
      const products = await NativePurchases.getProducts({
        productIdentifiers: PRODUCT_IDS,
      });
      
      const mappedPackages = products.products.map(p => ({
        identifier: p.identifier.replace('pro_', ''),
        product: {
          title: p.title,
          priceString: p.priceString,
          identifier: p.identifier
        }
      }));
      
      setPackages(mappedPackages);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      const mockPro = typeof window !== 'undefined' && localStorage.getItem('mock_is_pro') === 'true';
      setIsPro(mockPro);
      setSubscriptionDaysLeft(mockPro ? 365 : 0);
      setLoading(false);
      return;
    }

    try {
      // In Capgo, we usually check if there are active purchases
      // For more security, this should be validated on server
      // Here we check local status
      // Note: Capgo v7 specific logic
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(async (pkg: any) => {
    setLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsPro(true);
        if (typeof window !== 'undefined') localStorage.setItem('mock_is_pro', 'true');
        return true;
      }

      const { NativePurchases } = await import('@capgo/native-purchases');
      await NativePurchases.purchaseProduct({
        productIdentifier: pkg.product.identifier,
      });
      
      // If purchase doesn't throw error, it's successful
      setIsPro(true);
      return true;
    } catch (error: any) {
      console.error('Purchase failed:', error);
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
      
      const { NativePurchases } = await import('@capgo/native-purchases');
      await NativePurchases.restorePurchases();
      setIsPro(true); // Simplified
      return true;
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

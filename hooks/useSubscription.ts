import { useState, useEffect, useCallback } from 'react';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { Capacitor } from '@capacitor/core';

export const useSubscription = () => {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [subscriptionEndAt, setSubscriptionEndAt] = useState<Date | null>(null);
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState<number | null>(null);

  const PLANS = {
    weekly: 'docsguard_pro_weekly',
    monthly: 'docsguard_pro_monthly',
    yearly: 'docsguard_pro_yearly',
  };

  useEffect(() => {
    if (isPro && subscriptionEndAt) {
      const diffTime = subscriptionEndAt.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setSubscriptionDaysLeft(diffDays > 0 ? diffDays : 0);
    } else {
      setSubscriptionDaysLeft(null);
    }
  }, [isPro, subscriptionEndAt]);

  const fetchProducts = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      // Mock products for web
      setProducts([
        { identifier: PLANS.weekly, title: 'Weekly Pro', priceString: '$2.99' },
        { identifier: PLANS.monthly, title: 'Monthly Pro', priceString: '$6.99' },
        { identifier: PLANS.yearly, title: 'Yearly Pro', priceString: '$29.99' },
      ]);
      return;
    }

    try {
      const { products } = await NativePurchases.getProducts({
        productIdentifiers: Object.values(PLANS),
        productType: PURCHASE_TYPE.SUBS,
      });
      setProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  const subscribe = useCallback(async (planKey: keyof typeof PLANS = 'monthly') => {
    const productIdentifier = PLANS[planKey];
    setLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        // Mock success on web after delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsPro(true);
        
        // Mock end date: 30 days from now for monthly
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (planKey === 'weekly' ? 7 : planKey === 'monthly' ? 30 : 365));
        setSubscriptionEndAt(endDate);
        
        return true;
      }

      await NativePurchases.purchaseProduct({
        productIdentifier,
        productType: PURCHASE_TYPE.SUBS,
      });
      
      setIsPro(true);
      // In real app, you'd fetch the real expiry date from server
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      setSubscriptionEndAt(endDate);
      return true;
    } catch (error) {
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
        return;
      }
      
      await NativePurchases.restorePurchases();
      // Mock restoration
      setIsPro(true);
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    isPro,
    loading,
    products,
    subscriptionDaysLeft,
    subscribe,
    restorePurchases
  };
};

import { useState, useEffect, useCallback } from 'react';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { Capacitor } from '@capacitor/core';

export const useSubscription = () => {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const PLANS = {
    weekly: 'docsguard_pro_weekly',
    monthly: 'docsguard_pro_monthly',
    yearly: 'docsguard_pro_yearly',
  };

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
        alert(`Successfully subscribed to ${planKey} (Mock)`);
        return;
      }

      await NativePurchases.purchaseProduct({
        productIdentifier,
        productType: PURCHASE_TYPE.SUBS,
      });
      
      setIsPro(true);
      alert('Welcome to Pro!');
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    setLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        alert('Restore not available on web');
        return;
      }
      
      // For Capgo, checking current entitlements or restoring
      await NativePurchases.restorePurchases();
      // In a real app, you'd verify the receipt/entitlements here
      alert('Purchases restored if any exist.');
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
    subscribe,
    restorePurchases
  };
};

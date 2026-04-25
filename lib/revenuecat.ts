import { Capacitor } from '@capacitor/core';

const APPLE_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_APPLE_KEY || 'appl_placeholder';
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_KEY || 'goog_placeholder';

// Helper to get Purchases dynamically to avoid SSR/Module issues
const getPurchases = async () => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return null;
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  return Purchases;
};

export const initRevenueCat = async (appUserId?: string) => {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    const configuration = {
      apiKey: Capacitor.getPlatform() === 'ios' ? APPLE_API_KEY : GOOGLE_API_KEY,
      appUserID: appUserId || undefined,
    };
    
    await Purchases.configure(configuration);
    
    console.log('RevenueCat initialized successfully', appUserId ? `with user: ${appUserId}` : '');
  } catch (error) {
    console.error('RevenueCat initialization failed:', error);
  }
};

export const loginRevenueCat = async (appUserId: string) => {
  const Purchases = await getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.logIn({ appUserID: appUserId });
  } catch (error) {
    console.error('Error logging into RevenueCat:', error);
    return null;
  }
};

export const logoutRevenueCat = async () => {
  const Purchases = await getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.logOut();
  } catch (error) {
    console.error('Error logging out of RevenueCat:', error);
    return null;
  }
};

export const getOfferings = async () => {
  const Purchases = await getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

export const getCustomerInfo = async () => {
  const Purchases = await getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error fetching customer info:', error);
    return null;
  }
};

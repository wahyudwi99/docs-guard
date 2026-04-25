import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const APPLE_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_APPLE_KEY || 'appl_placeholder';
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_KEY || 'goog_placeholder';

export const initRevenueCat = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('RevenueCat: Not a native platform, skipping initialization.');
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    if (Capacitor.getPlatform() === 'ios') {
      await Purchases.configure({ apiKey: APPLE_API_KEY });
    } else if (Capacitor.getPlatform() === 'android') {
      await Purchases.configure({ apiKey: GOOGLE_API_KEY });
    }
    
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('RevenueCat initialization failed:', error);
  }
};

export const getOfferings = async () => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

export const getCustomerInfo = async () => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error fetching customer info:', error);
    return null;
  }
};

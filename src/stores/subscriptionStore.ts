import { create } from 'zustand';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ── RevenueCat config ────────────────────────────────────────────────────────
// Public SDK key (safe in the client). Project "Paly" — Test Store key for dev.
// After you add iOS/Android apps in RevenueCat, swap to appl_… / goog_… from the dashboard.
export const RC_API_KEY = Platform.select({
  ios: 'test_aCvLqTsPsfFDCbBmqhceXATMQas',
  android: 'test_aCvLqTsPsfFDCbBmqhceXATMQas',
  default: 'test_aCvLqTsPsfFDCbBmqhceXATMQas',
})!;

// Must match RevenueCat entitlement lookup key (Project → Entitlements).
export const ENTITLEMENT_PRO = 'Paly Pro';
export const PRODUCT_MONTHLY = 'paly_pro_monthly';
export const PRODUCT_ANNUAL = 'paly_pro_annual';
export const FREE_CLASS_LIMIT = 2;
export const PALY_POINTS_FREE_MONTH_THRESHOLD = 500;

interface SubscriptionState {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  monthlyPackage: PurchasesPackage | null;
  annualPackage: PurchasesPackage | null;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;

  // Actions
  initialize: (userId: string) => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchaseMonthly: () => Promise<boolean>;
  purchaseAnnual: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkEntitlement: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  canAddClass: (currentClassCount: number) => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPro: false,
  customerInfo: null,
  monthlyPackage: null,
  annualPackage: null,
  isLoading: false,
  isRestoring: false,
  error: null,

  initialize: async (userId: string) => {
    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      Purchases.configure({ apiKey: RC_API_KEY });
      await Purchases.logIn(userId);
      await get().fetchOfferings();
      await get().checkEntitlement();
    } catch (error: any) {
      console.error('RevenueCat init error:', error);
      set({ error: error.message });
    }
  },

  fetchOfferings: async () => {
    try {
      set({ isLoading: true });
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) {
        set({ isLoading: false });
        return;
      }

      const monthly = current.availablePackages.find(
        (p) => p.product.identifier === PRODUCT_MONTHLY
      ) || current.monthly || null;

      const annual = current.availablePackages.find(
        (p) => p.product.identifier === PRODUCT_ANNUAL
      ) || current.annual || null;

      set({ monthlyPackage: monthly, annualPackage: annual, isLoading: false });
    } catch (error: any) {
      console.error('Fetch offerings error:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  purchaseMonthly: async () => {
    const { monthlyPackage } = get();
    if (!monthlyPackage) {
      set({ error: 'Monthly plan not available' });
      return false;
    }
    try {
      set({ isLoading: true, error: null });
      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
      set({ customerInfo, isPro, isLoading: false });
      return isPro;
    } catch (error: any) {
      if (!error.userCancelled) {
        set({ error: error.message });
      }
      set({ isLoading: false });
      return false;
    }
  },

  purchaseAnnual: async () => {
    const { annualPackage } = get();
    if (!annualPackage) {
      set({ error: 'Annual plan not available' });
      return false;
    }
    try {
      set({ isLoading: true, error: null });
      const { customerInfo } = await Purchases.purchasePackage(annualPackage);
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
      set({ customerInfo, isPro, isLoading: false });
      return isPro;
    } catch (error: any) {
      if (!error.userCancelled) {
        set({ error: error.message });
      }
      set({ isLoading: false });
      return false;
    }
  },

  restorePurchases: async () => {
    try {
      set({ isRestoring: true, error: null });
      const customerInfo = await Purchases.restorePurchases();
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
      set({ customerInfo, isPro, isRestoring: false });
      return isPro;
    } catch (error: any) {
      set({ isRestoring: false, error: error.message });
      return false;
    }
  },

  checkEntitlement: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
      set({ customerInfo, isPro });
    } catch (error: any) {
      console.error('Check entitlement error:', error);
    }
  },

  refreshCustomerInfo: async () => {
    await get().checkEntitlement();
  },

  canAddClass: (currentClassCount: number) => {
    const { isPro } = get();
    if (isPro) return true;
    return currentClassCount < FREE_CLASS_LIMIT;
  },
}));

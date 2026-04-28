import { create } from 'zustand';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
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
  isInitialized: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;

  // Lifecycle
  initialize: (userId: string) => Promise<void>;
  fetchOfferings: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;

  // Purchase / restore
  purchaseMonthly: () => Promise<boolean>;
  purchaseAnnual: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;

  // RevenueCat-hosted UI
  presentPaywall: () => Promise<boolean>;
  presentPaywallIfNeeded: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<void>;

  // Helpers
  canAddClass: (currentClassCount: number) => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => {
  // Single shared listener — lets the RC-hosted Paywall and Customer Center
  // update our app state after purchases/cancellations without a manual refresh.
  const handleCustomerInfo = (info: CustomerInfo) => {
    const isPro = !!info.entitlements.active[ENTITLEMENT_PRO];
    set({ customerInfo: info, isPro });
  };

  return {
    isPro: false,
    customerInfo: null,
    monthlyPackage: null,
    annualPackage: null,
    isInitialized: false,
    isLoading: false,
    isRestoring: false,
    error: null,

    initialize: async (userId: string) => {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        if (!get().isInitialized) {
          Purchases.configure({ apiKey: RC_API_KEY, appUserID: userId });
          Purchases.addCustomerInfoUpdateListener(handleCustomerInfo);
          set({ isInitialized: true });
        } else {
          // App already configured (e.g. user signed out and back in)
          await Purchases.logIn(userId);
        }

        await get().fetchOfferings();
        await get().refreshCustomerInfo();
      } catch (error: any) {
        console.error('[RC] init error:', error);
        set({ error: error?.message ?? 'RevenueCat init failed' });
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

        const monthly =
          current.availablePackages.find((p) => p.product.identifier === PRODUCT_MONTHLY) ||
          current.monthly ||
          null;

        const annual =
          current.availablePackages.find((p) => p.product.identifier === PRODUCT_ANNUAL) ||
          current.annual ||
          null;

        set({ monthlyPackage: monthly, annualPackage: annual, isLoading: false });
      } catch (error: any) {
        console.error('[RC] fetch offerings error:', error);
        set({ isLoading: false, error: error?.message });
      }
    },

    refreshCustomerInfo: async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        handleCustomerInfo(info);
      } catch (error: any) {
        console.error('[RC] refresh customer info error:', error);
      }
    },

    purchaseMonthly: async () => {
      const { monthlyPackage } = get();
      if (!monthlyPackage) {
        set({ error: 'Monthly plan not available' });
        return false;
      }
      return purchaseAndReport(monthlyPackage, set);
    },

    purchaseAnnual: async () => {
      const { annualPackage } = get();
      if (!annualPackage) {
        set({ error: 'Annual plan not available' });
        return false;
      }
      return purchaseAndReport(annualPackage, set);
    },

    restorePurchases: async () => {
      try {
        set({ isRestoring: true, error: null });
        const info = await Purchases.restorePurchases();
        handleCustomerInfo(info);
        set({ isRestoring: false });
        return !!info.entitlements.active[ENTITLEMENT_PRO];
      } catch (error: any) {
        set({ isRestoring: false, error: error?.message });
        return false;
      }
    },

    presentPaywall: async () => {
      const result = await RevenueCatUI.presentPaywall();
      await get().refreshCustomerInfo();
      return (
        result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED
      );
    },

    presentPaywallIfNeeded: async () => {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_PRO,
      });
      await get().refreshCustomerInfo();
      // NOT_PRESENTED means the user already has the entitlement.
      return (
        result === PAYWALL_RESULT.NOT_PRESENTED ||
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      );
    },

    presentCustomerCenter: async () => {
      try {
        await RevenueCatUI.presentCustomerCenter();
        await get().refreshCustomerInfo();
      } catch (error: any) {
        console.error('[RC] customer center error:', error);
      }
    },

    canAddClass: (currentClassCount: number) => {
      const { isPro } = get();
      if (isPro) return true;
      return currentClassCount < FREE_CLASS_LIMIT;
    },
  };
});

async function purchaseAndReport(
  pkg: PurchasesPackage,
  set: (partial: Partial<SubscriptionState>) => void
): Promise<boolean> {
  try {
    set({ isLoading: true, error: null });
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_PRO];
    set({ customerInfo, isPro, isLoading: false });
    return isPro;
  } catch (error: any) {
    set({ isLoading: false });
    if (error?.code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      set({ error: error?.message ?? 'Purchase failed' });
    }
    return false;
  }
}

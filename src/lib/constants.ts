/**
 * Subscription and gamification constants shared between stores.
 *
 * These live outside subscriptionStore so modules that only need the numbers
 * (studyStore, screens) don't have to pull in the RevenueCat native module.
 */

/** Must match the RevenueCat entitlement lookup key (Project → Entitlements). */
export const ENTITLEMENT_PRO = 'Paly Pro';

export const PRODUCT_MONTHLY = 'paly_pro_monthly';
export const PRODUCT_ANNUAL = 'paly_pro_annual';

/** Classes a free user may create before the paywall. */
export const FREE_CLASS_LIMIT = 2;

/**
 * Monthly Paly Points that earn a free month of Pro. The server re-checks this
 * threshold in the grant-free-month function — the client value is only used to
 * decide when it is worth asking.
 */
export const PALY_POINTS_FREE_MONTH_THRESHOLD = 500;

/**
 * Fraction of quiz questions that must be correct to pass. Passing is what keeps
 * the study-delivery privilege alive and what earns the quiz_pass points. Kept
 * in sync with QUIZ_PASS_THRESHOLD in supabase/functions/_shared/quiz.ts and the
 * 0.8 check in the award_paly_points migration.
 */
export const QUIZ_PASS_THRESHOLD = 0.8;

/**
 * Length of the Paly Pro free trial, in days. The real duration is configured as
 * an introductory offer in App Store Connect / Play Console — this constant is
 * only for display copy and must be kept in step with it.
 */
export const TRIAL_DAYS = 7;

/**
 * The SendBlue number students text to link their handset. Must match
 * SENDBLUE_PHONE_NUMBER in the edge function secrets, or the opt-in text goes
 * to a number whose inbound webhook we do not control.
 */
export const PALY_SMS_NUMBER = '+19293649402';

/**
 * Public site. Serves the landing page plus the legal documents, built from
 * landing/ and deployed on every push to master (see vercel.json).
 *
 * App Store Connect fetches the privacy URL at submission and the in-app links
 * have to agree with what is entered there, so this has to stay on the domain
 * we own. The apex 308-redirects to www, so www is the form to use everywhere.
 */
export const PALY_SITE_URL = 'https://www.paly.study';
export const PRIVACY_URL = `${PALY_SITE_URL}/privacy-policy.html`;
export const TERMS_URL = `${PALY_SITE_URL}/terms-of-service.html`;
export const SUPPORT_EMAIL = 'support@paly.study';

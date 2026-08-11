import { Profile } from '../types/database';

export interface TrialStatus {
  /** The current entitlement is a free trial rather than a paid period. */
  isTrialing: boolean;
  /** Whole days remaining, rounded up. 0 means it lapses today. */
  daysLeft: number;
  /** This account has already used its free trial and cannot start another. */
  hasUsedTrial: boolean;
}

/**
 * Derives trial state from the server-maintained profile columns.
 *
 * Entitlement itself always comes from RevenueCat (`isPro`) — this only
 * describes *why* the user has it, so the UI can show "3 days left" and the
 * paywall can offer a trial only to people who have never had one.
 */
export function getTrialStatus(profile: Profile | null): TrialStatus {
  if (!profile) {
    return { isTrialing: false, daysLeft: 0, hasUsedTrial: false };
  }

  const hasUsedTrial = !!profile.trial_used_at;

  if (!profile.is_trial || !profile.premium_until) {
    return { isTrialing: false, daysLeft: 0, hasUsedTrial };
  }

  const msLeft = new Date(profile.premium_until).getTime() - Date.now();

  if (msLeft <= 0) {
    return { isTrialing: false, daysLeft: 0, hasUsedTrial };
  }

  return {
    isTrialing: true,
    daysLeft: Math.ceil(msLeft / 86_400_000),
    hasUsedTrial,
  };
}

/** Short human label, e.g. "Ends today" / "3 days left". */
export function trialLabel(status: TrialStatus): string {
  if (!status.isTrialing) return '';
  if (status.daysLeft <= 1) return 'Ends today';
  return `${status.daysLeft} days left`;
}

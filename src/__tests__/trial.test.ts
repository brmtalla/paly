import { getTrialStatus, trialLabel } from '../lib/trial';
import { Profile } from '../types/database';

const profile = (overrides: Partial<Profile>): Profile =>
  ({
    id: 'u1',
    is_premium: false,
    premium_until: null,
    is_trial: false,
    trial_used_at: null,
    trial_nudge_sent_at: null,
    ...overrides,
  }) as Profile;

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

describe('getTrialStatus', () => {
  it('reports no trial for a null profile', () => {
    expect(getTrialStatus(null)).toEqual({
      isTrialing: false,
      daysLeft: 0,
      hasUsedTrial: false,
    });
  });

  it('reports an active trial with days remaining', () => {
    const status = getTrialStatus(
      profile({
        is_premium: true,
        is_trial: true,
        premium_until: inDays(3),
        trial_used_at: inDays(-4),
      })
    );

    expect(status.isTrialing).toBe(true);
    expect(status.daysLeft).toBe(3);
    expect(status.hasUsedTrial).toBe(true);
  });

  it('treats a lapsed trial as not trialing but still used', () => {
    const status = getTrialStatus(
      profile({ is_trial: true, premium_until: inDays(-1), trial_used_at: inDays(-8) })
    );

    expect(status.isTrialing).toBe(false);
    expect(status.daysLeft).toBe(0);
    // Critical: a used trial must never be offered again.
    expect(status.hasUsedTrial).toBe(true);
  });

  it('does not treat a converted paid subscription as a trial', () => {
    const status = getTrialStatus(
      profile({
        is_premium: true,
        is_trial: false,
        premium_until: inDays(30),
        trial_used_at: inDays(-40),
      })
    );

    expect(status.isTrialing).toBe(false);
    expect(status.hasUsedTrial).toBe(true);
  });

  it('remembers a past trial even for a user with no entitlement now', () => {
    expect(getTrialStatus(profile({ trial_used_at: inDays(-90) })).hasUsedTrial).toBe(true);
  });
});

describe('trialLabel', () => {
  it('says "Ends today" on the final day', () => {
    const status = getTrialStatus(
      profile({ is_premium: true, is_trial: true, premium_until: inDays(0.5) })
    );
    expect(trialLabel(status)).toBe('Ends today');
  });

  it('counts down remaining days', () => {
    const status = getTrialStatus(
      profile({ is_premium: true, is_trial: true, premium_until: inDays(4) })
    );
    expect(trialLabel(status)).toBe('4 days left');
  });

  it('is empty when not trialing', () => {
    expect(trialLabel(getTrialStatus(null))).toBe('');
  });
});

import { supabaseAdmin } from './supabase.ts';

/**
 * Paly Pro unlocks SMS/iMessage delivery and flashcards. Push notifications and
 * in-app study chunks stay free for everyone.
 *
 * `profiles.is_premium` is the server-side mirror of the RevenueCat entitlement,
 * kept current by the revenuecat-webhook function and set directly by
 * grant-free-month. Edge functions must read this rather than trusting the
 * client, which can claim anything.
 */
export async function isPro(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('is_premium, premium_until')
    .eq('id', userId)
    .maybeSingle();

  if (!data?.is_premium) return false;

  // A promotional/expiring grant stays valid until its expiry passes. A null
  // premium_until means an active subscription with no known end date.
  if (data.premium_until && new Date(data.premium_until) < new Date()) return false;

  return true;
}

/** Batch variant — avoids one round trip per user in the delivery loop. */
export async function proUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, is_premium, premium_until')
    .in('id', userIds)
    .eq('is_premium', true);

  const now = new Date();
  const pro = new Set<string>();

  for (const row of data ?? []) {
    if (row.premium_until && new Date(row.premium_until) < now) continue;
    pro.add(row.id);
  }

  return pro;
}

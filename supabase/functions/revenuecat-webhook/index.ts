import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';

/**
 * Receives RevenueCat subscriber events and mirrors the Paly Pro entitlement
 * onto profiles.is_premium / premium_until, which is what the edge functions
 * consult before sending SMS.
 *
 * Configure in RevenueCat: Project → Integrations → Webhooks
 *   URL:            https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
 *   Authorization:  the exact value of the REVENUECAT_WEBHOOK_SECRET secret
 *
 * Deploy with --no-verify-jwt: RevenueCat authenticates with the header above,
 * not a Supabase JWT.
 */
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
const ENTITLEMENT_PRO = 'Paly Pro';

/** Events that mean the entitlement is active right now. */
const GRANTING_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'PRODUCT_CHANGE',
]);

/** Events that revoke access immediately. */
const REVOKING_EVENTS = new Set(['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED', 'TRANSFER']);

// CANCELLATION is deliberately in neither set: the user keeps access until the
// period ends, at which point EXPIRATION arrives.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!WEBHOOK_SECRET) {
    console.error('REVENUECAT_WEBHOOK_SECRET is not configured');
    return json({ error: 'Webhook not configured' }, 503);
  }

  if (req.headers.get('Authorization') !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await req.json();
    const event = payload?.event;

    if (!event?.type) {
      return json({ error: 'Malformed event' }, 400);
    }

    // app_user_id is the Supabase user id — subscriptionStore configures
    // RevenueCat with `appUserID: userId`.
    const userId: string | undefined = event.app_user_id ?? event.original_app_user_id;

    if (!userId) {
      return json({ error: 'Missing app_user_id' }, 400);
    }

    // Ignore events for other entitlements (e.g. future tiers).
    const entitlements: string[] = event.entitlement_ids ??
      (event.entitlement_id ? [event.entitlement_id] : []);

    if (entitlements.length > 0 && !entitlements.includes(ENTITLEMENT_PRO)) {
      return json({ success: true, ignored: `entitlement ${entitlements.join(',')}` });
    }

    let isPremium: boolean;

    if (GRANTING_EVENTS.has(event.type)) {
      isPremium = true;
    } else if (REVOKING_EVENTS.has(event.type)) {
      isPremium = false;
    } else {
      // BILLING_ISSUE, CANCELLATION, TEST, etc. — access is unchanged.
      return json({ success: true, ignored: event.type });
    }

    // expiration_at_ms is epoch millis; null for lifetime/non-expiring grants.
    const premiumUntil =
      isPremium && event.expiration_at_ms
        ? new Date(Number(event.expiration_at_ms)).toISOString()
        : null;

    // period_type is TRIAL during a free trial and NORMAL once it converts to a
    // paid period. Access is identical either way — this only drives the
    // "N days left" UI and the one-time conversion nudge.
    const isTrial = isPremium && event.period_type === 'TRIAL';

    const update: Record<string, unknown> = {
      is_premium: isPremium,
      premium_until: premiumUntil,
      is_trial: isTrial,
      updated_at: new Date().toISOString(),
    };

    // Stamp only the *first* trial — it is a permanent "has trialled" marker, so
    // later TRIAL events must not reset it. Clear the nudge flag so a genuinely
    // new trial can be nudged again.
    if (isTrial) {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('trial_used_at')
        .eq('id', userId)
        .maybeSingle();

      if (!existing?.trial_used_at) {
        update.trial_used_at = new Date().toISOString();
      }
      update.trial_nudge_sent_at = null;
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(update)
      .eq('id', userId);

    if (error) {
      console.error('Entitlement sync failed:', error);
      // 500 makes RevenueCat retry rather than silently dropping the event.
      return json({ error: 'Failed to sync entitlement' }, 500);
    }

    console.log(`Entitlement ${isPremium ? 'granted' : 'revoked'} for ${userId} (${event.type})`);

    return json({ success: true, userId, isPremium, premiumUntil });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUserId, unauthorizedResponse } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSmsToProfile } from "../_shared/sms.ts";

const RC_SECRET_KEY = Deno.env.get("REVENUECAT_SECRET_KEY")!;
/** RevenueCat entitlement lookup key (same as client ENTITLEMENT_PRO). */
const ENTITLEMENT_LOOKUP_KEY = "Paly Pro";
const POINTS_THRESHOLD = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let userId: string;
  try {
    userId = await requireUserId(req);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  try {
    // Verify the user actually has enough points
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("paly_points, paly_points_month, phone_number, sms_opted_in, assistant_name, free_month_granted_at")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentMonth = new Date().toISOString().substring(0, 7);
    const pts = profile.paly_points_month === currentMonth ? (profile.paly_points || 0) : 0;

    if (pts < POINTS_THRESHOLD) {
      return new Response(
        JSON.stringify({ error: "Not enough points", current: pts, required: POINTS_THRESHOLD }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already granted this month
    if (profile.free_month_granted_at) {
      const grantedMonth = profile.free_month_granted_at.substring(0, 7);
      if (grantedMonth === currentMonth) {
        return new Response(
          JSON.stringify({ error: "Free month already granted this month" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Grant promotional access via RevenueCat REST API v1
    const entitlementPath = encodeURIComponent(ENTITLEMENT_LOOKUP_KEY);
    const rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}/entitlements/${entitlementPath}/promotional`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RC_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duration: "monthly",
          start_time_ms: Date.now(),
        }),
      }
    );

    if (!rcResponse.ok) {
      const rcError = await rcResponse.text();
      console.error("RevenueCat grant error:", rcError);
      return new Response(
        JSON.stringify({ error: "Failed to grant entitlement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the grant, unlock Pro locally, and reset points. Setting
    // is_premium here means SMS works immediately rather than waiting for
    // RevenueCat's webhook to land.
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + 1);

    await supabaseAdmin
      .from("profiles")
      .update({
        free_month_granted_at: new Date().toISOString(),
        is_premium: true,
        premium_until: premiumUntil.toISOString(),
        paly_points: 0,
      })
      .eq("id", userId);

    // Send SMS celebration
    {
      const name = profile.assistant_name || "Paly";
      await sendSmsToProfile(
        profile,
        `${name} here! 🎉 You've earned ${POINTS_THRESHOLD} Paly Points — your free month of Paly Pro is unlocked! Keep studying to earn more.`
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Free month granted!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Grant free month error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

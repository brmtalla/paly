import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUserId, unauthorizedResponse } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSmsToProfile } from "../_shared/sms.ts";
import { isPro } from "../_shared/entitlement.ts";

const BASE_WEEKLY_LIMIT = 5;
const POINTS_PER_EXTRA = 25;

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
    const { classId, spendPoints } = await req.json();

    if (!classId) {
      return new Response(
        JSON.stringify({ error: "Missing classId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The class must belong to the caller.
    const { data: ownedClass } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!ownedClass) {
      return new Response(
        JSON.stringify({ error: "Class not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pulling tomorrow's chunk early is delivered by text — a Paly Pro feature.
    if (!(await isPro(userId))) {
      return new Response(
        JSON.stringify({
          error: "pro_required",
          message: "Requesting your next chunk early is a Paly Pro feature.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone_number, sms_opted_in, assistant_name, paly_points, paly_points_month")
      .eq("id", userId)
      .single();

    if (!profile?.phone_number) {
      return new Response(
        JSON.stringify({ error: "No phone number on profile" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count advance requests this week (Monday-Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const { count: advanceCount } = await supabaseAdmin
      .from("study_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("delivery_method", "advance")
      .gte("delivered_at", weekStart.toISOString());

    const usedThisWeek = advanceCount || 0;

    if (usedThisWeek >= BASE_WEEKLY_LIMIT) {
      if (!spendPoints) {
        return new Response(
          JSON.stringify({
            error: "weekly_limit_reached",
            usedThisWeek,
            limit: BASE_WEEKLY_LIMIT,
            pointsCost: POINTS_PER_EXTRA,
            currentPoints: profile.paly_points || 0,
            message: `You've used all ${BASE_WEEKLY_LIMIT} advance requests this week. Spend ${POINTS_PER_EXTRA} Paly Points for one more?`,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentMonth = now.toISOString().substring(0, 7);
      let pts = profile.paly_points || 0;
      const month = profile.paly_points_month || currentMonth;
      if (month !== currentMonth) pts = 0;

      if (pts < POINTS_PER_EXTRA) {
        return new Response(
          JSON.stringify({
            error: "insufficient_points",
            currentPoints: pts,
            pointsCost: POINTS_PER_EXTRA,
            message: `You need ${POINTS_PER_EXTRA} Paly Points but only have ${pts}.`,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin
        .from("profiles")
        .update({ paly_points: pts - POINTS_PER_EXTRA })
        .eq("id", userId);
    }

    // Find next undelivered prompt for this class (skip quiz prompts)
    const { data: nextPrompt, error: promptError } = await supabaseAdmin
      .from("study_prompts")
      .select("*, classes:class_id (name)")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .is("delivered_at", null)
      .neq("prompt_type", "quiz")
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .single();

    if (promptError || !nextPrompt) {
      return new Response(
        JSON.stringify({
          error: "no_chunks_available",
          message: "No undelivered study chunks left for this class. Upload more content!",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const className = (nextPrompt as any).classes?.name || "your class";
    const assistantName = profile.assistant_name || "Paly";
    const typeLabels: Record<string, string> = {
      takeaway: "Key Takeaway",
      recall: "Quick Recall",
      flashcard: "Flashcard",
    };
    const typeLabel = typeLabels[nextPrompt.prompt_type] || "Study Chunk";
    const smsBody = `${assistantName} here! 📚\n\n[${typeLabel} - Day ${nextPrompt.day_index}]\n${className}\n\n${nextPrompt.content}`;

    const smsResult = await sendSmsToProfile(profile, smsBody);
    const deliveredAt = new Date().toISOString();

    await supabaseAdmin
      .from("study_prompts")
      .update({
        delivered_at: deliveredAt,
        scheduled_for: deliveredAt,
        delivery_method: "advance",
      })
      .eq("id", nextPrompt.id);

    return new Response(
      JSON.stringify({
        success: true,
        smsDelivered: smsResult.success,
        smsSid: smsResult.sid,
        smsError: smsResult.error || null,
        deliveredAt,
        chunk: {
          id: nextPrompt.id,
          type: nextPrompt.prompt_type,
          dayIndex: nextPrompt.day_index,
          contentPreview: nextPrompt.content?.substring(0, 120) + "...",
          className,
        },
        usage: {
          usedThisWeek: usedThisWeek + 1,
          weeklyLimit: BASE_WEEKLY_LIMIT,
          pointsSpent: usedThisWeek >= BASE_WEEKLY_LIMIT ? POINTS_PER_EXTRA : 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Request chunk error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

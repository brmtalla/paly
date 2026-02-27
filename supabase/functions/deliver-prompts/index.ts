import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSms } from "../_shared/twilio.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = new Date().toISOString();

    // Fetch all undelivered prompts that are due
    const { data: duePrompts, error: fetchError } = await supabaseAdmin
      .from("study_prompts")
      .select(`
        *,
        classes:class_id (name)
      `)
      .lte("scheduled_for", now)
      .is("delivered_at", null)
      .order("scheduled_for")
      .limit(50);

    if (fetchError) {
      console.error("Fetch prompts error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch due prompts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!duePrompts || duePrompts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, delivered: 0, message: "No prompts due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group prompts by user to batch profile lookups
    const userIds = [...new Set(duePrompts.map((p) => p.user_id))];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, phone_number, full_name, assistant_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    let delivered = 0;
    let failed = 0;
    const results: { promptId: string; status: string; error?: string }[] = [];

    for (const prompt of duePrompts) {
      const profile = profileMap.get(prompt.user_id);

      if (!profile?.phone_number) {
        results.push({ promptId: prompt.id, status: "skipped", error: "No phone number" });
        continue;
      }

      const className = (prompt as any).classes?.name || "your class";
      const assistantName = profile.assistant_name || "Paly";

      // Format the SMS message
      const smsBody = formatPromptMessage(prompt, className, assistantName);

      const smsResult = await sendSms(profile.phone_number, smsBody);

      if (smsResult.success) {
        // Mark as delivered
        await supabaseAdmin
          .from("study_prompts")
          .update({ delivered_at: new Date().toISOString() })
          .eq("id", prompt.id);

        delivered++;
        results.push({ promptId: prompt.id, status: "delivered" });
      } else {
        failed++;
        results.push({ promptId: prompt.id, status: "failed", error: smsResult.error });
      }
    }

    return new Response(
      JSON.stringify({ success: true, delivered, failed, total: duePrompts.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Deliver prompts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPromptMessage(
  prompt: { prompt_type: string; content: string; day_index: number },
  className: string,
  assistantName: string
): string {
  const typeLabels: Record<string, string> = {
    takeaway: "Key Takeaway",
    recall: "Quick Recall",
    quiz: "Quiz Time",
    flashcard: "Flashcard",
  };

  const typeLabel = typeLabels[prompt.prompt_type] || "Study Prompt";
  const dayLabel = `Day ${prompt.day_index}`;

  return `${assistantName} here! 📚\n\n[${typeLabel} - ${dayLabel}]\n${className}\n\n${prompt.content}`;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSms } from "../_shared/twilio.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { synthesizedContentId, userId } = await req.json();

    if (!synthesizedContentId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing synthesizedContentId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone_number, assistant_name")
      .eq("id", userId)
      .single();

    if (!profile?.phone_number) {
      return new Response(
        JSON.stringify({ error: "No phone number set on your profile" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: content, error: contentError } = await supabaseAdmin
      .from("synthesized_content")
      .select("*, classes:class_id (name)")
      .eq("id", synthesizedContentId)
      .single();

    if (contentError || !content) {
      return new Response(
        JSON.stringify({ error: "Synthesized content not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const className = (content as any).classes?.name || "your class";
    const assistantName = profile.assistant_name || "Paly";

    // Build a pool of sendable pieces from this session's content
    const pool: { type: string; text: string }[] = [];

    const takeaways = content.key_takeaways as string[] | null;
    if (takeaways?.length) {
      for (const t of takeaways) {
        pool.push({ type: "Key Takeaway", text: t });
      }
    }

    const flashcards = content.flashcards as { front: string; back: string }[] | null;
    if (flashcards?.length) {
      for (const f of flashcards) {
        pool.push({ type: "Flashcard", text: `Q: ${f.front}\nA: ${f.back}` });
      }
    }

    const chunks = content.daily_chunks as { day: number; content: string }[] | null;
    if (chunks?.length) {
      for (const c of chunks) {
        pool.push({ type: "Study Chunk", text: c.content });
      }
    }

    if (content.summary) {
      pool.push({ type: "Summary", text: content.summary });
    }

    if (pool.length === 0) {
      return new Response(
        JSON.stringify({ error: "No study content available for this session" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];

    const smsBody = `${assistantName} here! 🧠\n\n[${pick.type}]\n${className} — ${content.session_date}\n\n${pick.text}`;

    const result = await sendSms(profile.phone_number, smsBody);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || "SMS send failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: { type: pick.type, preview: pick.text.substring(0, 100) },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send now error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

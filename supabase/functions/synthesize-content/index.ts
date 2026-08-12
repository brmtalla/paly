import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUserId, unauthorizedResponse } from "../_shared/auth.ts";
import { aiUnavailableResponse, hasClaudeKey } from "../_shared/claude.ts";
import { synthesizeStudyContent } from "../_shared/synthesis.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // This endpoint spends model credits, so it is never open to anonymous callers.
  try {
    await requireUserId(req);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  try {
    if (!hasClaudeKey()) {
      return aiUnavailableResponse(corsHeaders);
    }

    const { content, className, numStudyDays: requestedDays } = await req.json();

    if (!content || content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Content too short to synthesize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numStudyDays = Math.max(1, Math.min(requestedDays || 7, 14));

    const synthesized = await synthesizeStudyContent(content, className, numStudyDays);

    return new Response(
      JSON.stringify(synthesized),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Synthesis error:", error);
    return new Response(
      JSON.stringify({ error: "AI synthesis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

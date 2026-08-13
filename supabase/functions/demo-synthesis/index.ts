import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSms } from "../_shared/sms.ts";
import {
  aiUnavailableResponse,
  claude,
  CLAUDE_MODEL,
  hasClaudeKey,
  textFrom,
  wasRefused,
} from "../_shared/claude.ts";
import { extractPdfText } from "../_shared/synthesis.ts";
import { toBullets } from "../_shared/bullets.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!hasClaudeKey()) {
      return aiUnavailableResponse(corsHeaders);
    }

    const { fileData, fileName, phoneNumber } = await req.json();

    if (!fileData || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Missing file or phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate-limit: max 3 demo requests per phone number per day
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabaseAdmin
      .from("landing_demo_requests")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", phoneNumber)
      .gte("created_at", `${today}T00:00:00Z`);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "You've hit the daily demo limit. Download the app for unlimited access!" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extracting text from PDF:", fileName);
    const extractedText = await extractPdfText(fileData);

    if (!extractedText || extractedText.length < 50) {
      return new Response(
        JSON.stringify({ error: "Couldn't extract enough text from this PDF. Try a different file." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Synthesize a concise summary
    console.log("Synthesizing content, text length:", extractedText.length);
    const synthesis = await synthesize(extractedText);

    const smsBody = `${synthesis}\n\n— Paly (paly.study)`;

    const smsResult = await sendSms(phoneNumber, smsBody);

    if (!smsResult.success) {
      console.error("SMS failed:", smsResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to send text. Please check your number and try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the demo request
    await supabaseAdmin.from("landing_demo_requests").insert({
      phone_number: phoneNumber,
      file_name: fileName || "unknown.pdf",
      text_length: extractedText.length,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Demo synthesis error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * The one text a stranger ever gets from Paly, so it has to look exactly like
 * the real thing: a header line, bullets, and a recall question.
 *
 * Structured output rather than a formatting instruction — the same reason the
 * real pipeline uses it.
 */
const DEMO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["topic", "bullets", "recallQuestion"],
  properties: {
    topic: {
      type: "string",
      description: "What this material covers, in one short line — under 70 characters.",
    },
    bullets: {
      type: "array",
      description:
        "4-6 takeaways. Each is one standalone insight in 1-2 sentences with no leading marker, opening with the key term in caps when introducing one.",
      items: { type: "string" },
    },
    recallQuestion: {
      type: "string",
      description: "One question that tests whether the takeaways landed.",
    },
  },
} as const;

async function synthesize(content: string): Promise<string> {
  const message = await claude().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system:
      "You are Paly, a study companion that texts students their lecture material back as something they can actually use. " +
      "Someone has uploaded one lecture to see what you do with it. Pull out what matters and make it stick. " +
      "Write for a phone screen: the whole message lands in about 1200 characters. " +
      "Be warm and direct, the way a classmate who understood the lecture would explain it.",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: DEMO_SCHEMA },
    },
    messages: [{ role: "user", content: `Synthesize this lecture material:\n\n${content.substring(0, 60000)}` }],
  });

  if (wasRefused(message)) {
    console.error("Demo synthesis refused:", message.stop_details);
    throw new Error("AI synthesis failed");
  }

  const raw = textFrom(message);
  if (!raw) throw new Error("AI synthesis failed");

  const parsed = JSON.parse(raw);

  return [
    `📚 ${parsed.topic}`,
    "",
    toBullets(parsed.bullets ?? []),
    "",
    `Quick recall: ${parsed.recallQuestion}`,
  ].join("\n");
}

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSms } from "../_shared/sms.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Extract text from PDF via OpenAI
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

    // Send SMS
    const smsBody = `Here's your Paly synthesis:\n\n${synthesis}\n\n— Paly (paly.app)`;

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
      JSON.stringify({ error: error.message || "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractPdfText(base64Data: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extract ALL text content from this PDF. Return ONLY the raw text, preserving structure with newlines between sections. No commentary or formatting.",
            },
            {
              type: "input_file",
              filename: "document.pdf",
              file_data: `data:application/pdf;base64,${base64Data}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("PDF extraction failed:", response.status, errText);
    throw new Error("Failed to read PDF");
  }

  const data = await response.json();
  let text = "";
  if (data.output) {
    for (const item of data.output) {
      if (item.type === "message" && item.content) {
        for (const c of item.content) {
          if (c.type === "output_text") text += c.text;
        }
      }
    }
  }
  return text.trim();
}

async function synthesize(content: string): Promise<string> {
  const truncated = content.substring(0, 60000);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Paly, a friendly study assistant. The user uploaded a lecture PDF and wants a quick synthesis texted to them. Write a concise, useful synthesis that demonstrates value. 

Rules:
- Start with a one-line summary of what the material covers
- Then list 4-6 key takeaways as bullet points using "•"
- Each bullet should be a complete, standalone insight (1-2 sentences)
- Use ALL CAPS for key terms when introducing them
- Keep the total under 1400 characters (SMS-friendly)
- Be warm but academic — helpful, not patronizing
- End with a brief "Quick recall" question to test understanding`,
        },
        {
          role: "user",
          content: `Synthesize this lecture material:\n\n${truncated}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error("AI synthesis failed");
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

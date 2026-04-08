import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SENDBLUE_API_KEY = Deno.env.get("SENDBLUE_API_KEY");
const SENDBLUE_API_SECRET = Deno.env.get("SENDBLUE_API_SECRET");
const SENDBLUE_PHONE_NUMBER = Deno.env.get("SENDBLUE_PHONE_NUMBER");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const configStatus = {
    SENDBLUE_API_KEY: SENDBLUE_API_KEY ? `set (${SENDBLUE_API_KEY.substring(0, 6)}...)` : "NOT SET",
    SENDBLUE_API_SECRET: SENDBLUE_API_SECRET ? `set (${SENDBLUE_API_SECRET.substring(0, 6)}...)` : "NOT SET",
    SENDBLUE_PHONE_NUMBER: SENDBLUE_PHONE_NUMBER || "NOT SET",
  };

  try {
    const { to } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Send { \"to\": \"+1XXXXXXXXXX\" } in the body", configStatus }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SENDBLUE_API_KEY || !SENDBLUE_API_SECRET || !SENDBLUE_PHONE_NUMBER) {
      return new Response(
        JSON.stringify({ error: "Missing SendBlue secrets", configStatus }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.sendblue.co/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "sb-api-key-id": SENDBLUE_API_KEY,
        "sb-api-secret-key": SENDBLUE_API_SECRET,
      },
      body: JSON.stringify({
        number: to,
        from_number: SENDBLUE_PHONE_NUMBER,
        content: "Hey! This is Paly testing SMS delivery. If you got this, it works! 🎉",
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: response.ok && data.status !== "ERROR",
        httpStatus: response.status,
        sendblueResponse: data,
        configStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, configStatus }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

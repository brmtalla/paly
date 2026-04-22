import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phoneNumber, email, smsOptIn } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert subscriber — if they already exist, update their preferences
    const { error: upsertError } = await supabaseAdmin
      .from("landing_subscribers")
      .upsert(
        {
          phone_number: phoneNumber,
          email: email || null,
          sms_opt_in: smsOptIn ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone_number" }
      );

    if (upsertError) {
      console.error("Subscriber upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save your preferences" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Demo subscribe error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

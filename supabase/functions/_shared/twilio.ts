const SENDBLUE_API_KEY = Deno.env.get("SENDBLUE_API_KEY")!;
const SENDBLUE_API_SECRET = Deno.env.get("SENDBLUE_API_SECRET")!;
const SENDBLUE_PHONE_NUMBER = Deno.env.get("SENDBLUE_PHONE_NUMBER")!;

export async function sendSms(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
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
        content: body,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === "ERROR") {
      console.error("SendBlue error:", data);
      return { success: false, error: data.error_message || data.message || "SMS send failed" };
    }

    return { success: true, sid: data.message_handle };
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, error: error.message };
  }
}

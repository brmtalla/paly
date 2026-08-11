// SMS/iMessage delivery is handled by SendBlue (https://sendblue.co).

/** The fields every caller must load before it is allowed to text someone. */
export interface TextableProfile {
  phone_number?: string | null;
  sms_opted_in?: boolean | null;
}

/**
 * Sends to a student only if they are actually opted in.
 *
 * Prefer this over `sendSms` for anything addressed to a user. `sendSms` takes a
 * bare number and cannot check consent, which is how every send path ended up
 * ignoring `sms_opted_in` — texting anyone who merely had a number on file.
 * Reserve `sendSms` for replies inside the inbound webhook, where the student
 * has just messaged us and a reply is expected (and, for STOP, required).
 */
export async function sendSmsToProfile(
  profile: TextableProfile | null | undefined,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!profile?.phone_number) {
    return { success: false, error: 'No phone number linked' };
  }

  if (!profile.sms_opted_in) {
    return { success: false, error: 'Not opted in to SMS' };
  }

  return sendSms(profile.phone_number, body);
}

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

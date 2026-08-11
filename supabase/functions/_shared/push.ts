import { supabaseAdmin } from './supabase.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo rejects requests with more than 100 messages. */
const MAX_BATCH = 100;

export interface PushMessage {
  title: string;
  body: string;
  /** Deep-link payload consumed by useNotifications (see src/hooks). */
  data?: Record<string, unknown>;
  /** Android channel; must match a channel registered in src/lib/notifications.ts. */
  channelId?: 'default' | 'study-prompts' | 'class-reminders';
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Tokens Expo reported as unregistered — deactivated so we stop trying. */
  pruned: number;
}

/**
 * Sends a push to every active device belonging to a user.
 *
 * Push is the free tier's delivery channel: everyone gets their daily study
 * chunk as a notification, while SMS/iMessage is reserved for Paly Pro.
 *
 * Never throws — delivery failures must not abort the surrounding job.
 */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<PushResult> {
  const empty: PushResult = { sent: 0, failed: 0, pruned: 0 };

  try {
    const { data: tokens } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) return empty;

    return await sendToTokens(
      tokens.map((t) => t.token),
      message
    );
  } catch (error) {
    console.error('Push send error:', error);
    return empty;
  }
}

async function sendToTokens(tokens: string[], message: PushMessage): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, pruned: 0 };

  for (let i = 0; i < tokens.length; i += MAX_BATCH) {
    const batch = tokens.slice(i, i + MAX_BATCH);

    const payload = batch.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: 'default',
      channelId: message.channelId ?? 'study-prompts',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Expo push HTTP error:', response.status, await response.text());
      result.failed += batch.length;
      continue;
    }

    const body = await response.json();
    const tickets: { status?: string; details?: { error?: string } }[] = body.data ?? [];

    const deadTokens: string[] = [];

    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'ok') {
        result.sent++;
        return;
      }

      result.failed++;

      // The device uninstalled the app or the token rotated — stop sending to it.
      if (ticket.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(batch[idx]);
      }
    });

    if (deadTokens.length > 0) {
      await supabaseAdmin
        .from('push_tokens')
        .update({ is_active: false })
        .in('token', deadTokens);
      result.pruned += deadTokens.length;
    }
  }

  return result;
}

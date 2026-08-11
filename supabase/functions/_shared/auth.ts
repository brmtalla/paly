import { corsHeaders } from './cors.ts';
import { supabaseAdmin } from './supabase.ts';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Resolves the caller's user id from their JWT.
 *
 * Every function that reads or writes a specific user's data must derive the id
 * this way rather than trusting a `userId` in the request body — otherwise any
 * signed-in user could pass someone else's id and act on their account.
 */
export async function requireUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization header');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new AuthError('Invalid or expired token');
  }

  return user.id;
}

/** Standard 401 response for a failed `requireUserId`. */
export function unauthorizedResponse(error: unknown): Response {
  const message = error instanceof AuthError ? error.message : 'Unauthorized';

  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

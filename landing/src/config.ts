/**
 * Vite replaces `import.meta.env.VITE_*` statically at build time, so each
 * variable must be referenced by its literal name — dynamic indexing would not
 * be substituted and would come back undefined in a production build.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See landing/.env.example.`);
  }

  return value;
}

export const SUPABASE_URL = required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = required(
  'VITE_SUPABASE_ANON_KEY',
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// A public invite, so it lives in the source rather than an env var. Set to
// never expire — a landing page outlives any 30-day link.
export const DISCORD_INVITE_URL =
  import.meta.env.VITE_DISCORD_URL || 'https://discord.gg/fs3UzdvKta';

// Set once the apps are live; the download buttons stay hidden until then.
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || '';
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || '';

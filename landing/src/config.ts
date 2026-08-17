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

// Empty until the server exists — the footer link hides rather than 404s.
export const DISCORD_INVITE_URL = import.meta.env.VITE_DISCORD_URL || '';

// Set once the apps are live; the download buttons stay hidden until then.
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || '';
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || '';

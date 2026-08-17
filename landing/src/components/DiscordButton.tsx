import { DISCORD_INVITE_URL } from '../config';

/**
 * Until the app is on the App Store, this is the only thing a visitor can
 * actually *do* — so on the dark CTA it is the primary action, not a courtesy
 * link. It doubles as the waitlist: people who join are the ones to tell first.
 *
 * Renders nothing when no invite is configured, so a missing URL is a missing
 * button rather than a dead link.
 */
interface Props {
  /** `solid` is the primary CTA; `outline` sits next to something louder. */
  variant?: 'solid' | 'outline';
  label?: string;
  className?: string;
}

/** Discord's wordmark-free logo, the only form allowed at this size. */
function DiscordMark() {
  return (
    <svg viewBox="0 0 127.14 96.36" className="h-5 w-5 flex-none" fill="currentColor" aria-hidden="true">
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
    </svg>
  );
}

export default function DiscordButton({
  variant = 'solid',
  label = 'Join the Discord',
  className = '',
}: Props) {
  if (!DISCORD_INVITE_URL) return null;

  const styles =
    variant === 'solid'
      ? 'bg-[#5865F2] text-white hover:bg-[#4752C4] shadow-lift'
      : 'border border-white/20 text-white hover:bg-white/10';

  return (
    <a
      href={DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2.5 rounded-2xl px-7 py-4 font-semibold transition-all duration-200 ease-out-quart hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${styles} ${className}`}
    >
      <DiscordMark />
      {label}
    </a>
  );
}

import { APP_STORE_URL } from '../config';

/**
 * Apple's official "Download on the App Store" lockup.
 *
 * The artwork is Apple's and its use is governed by their marketing guidelines:
 * it may not be recoloured, redrawn, or stretched, and it has to keep clear
 * space of at least 10% of the badge height on every side. Hence a plain <img>
 * of the supplied SVG at a fixed height rather than an inlined, restyled copy.
 *
 * Before the app is live there is nothing to link to, so the badge renders
 * dimmed and unclickable with a note instead. Setting VITE_APP_STORE_URL turns
 * it into a real link with no code change.
 */
interface Props {
  /** Dark backgrounds get the note in light text. */
  tone?: 'light' | 'dark';
  className?: string;
}

const HEIGHT = 'h-[54px]';

export default function AppStoreBadge({ tone = 'dark', className = '' }: Props) {
  const badge = (
    <img
      src="/app-store-badge.svg"
      alt="Download on the App Store"
      width={161}
      height={54}
      className={`${HEIGHT} w-auto`}
    />
  );

  if (!APP_STORE_URL) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="opacity-45 grayscale" aria-hidden="true">
          {badge}
        </div>
        <p
          className={`text-xs font-medium ${
            tone === 'dark' ? 'text-paly-200/60' : 'text-paly-950/40'
          }`}
        >
          Coming to the App Store
        </p>
      </div>
    );
  }

  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      // No hover translate: Apple's guidelines do not allow the badge to be
      // animated or altered, so the affordance is opacity only.
      className={`inline-block rounded-lg transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {badge}
    </a>
  );
}

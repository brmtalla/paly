import { DISCORD_INVITE_URL, PLAY_STORE_URL } from '../config';
import AppStoreBadge from './AppStoreBadge';

export default function Footer() {

  return (
    <footer className="border-t border-paly-950/[0.06] bg-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* CTA banner */}
        <div className="relative mb-16 overflow-hidden rounded-3xl bg-paly-950 p-10 text-center sm:p-16">
          <div aria-hidden="true" className="animate-aurora absolute -left-24 -top-24 h-72 w-72 rounded-full bg-paly-500/25 blur-3xl" />
          <div aria-hidden="true" className="animate-aurora absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" style={{ animationDelay: "-8s" }} />
          <div className="relative">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to stop cramming?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-paly-100/70">
            Upload after class. Show up to the next one already knowing it.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppStoreBadge tone="dark" />
            {PLAY_STORE_URL ? (
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/20 px-8 py-4 font-semibold text-white transition-all duration-200 ease-out-quart hover:-translate-y-0.5 hover:bg-white/10"
              >
                Download for Android
              </a>
            ) : null}
          </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-2.5" aria-label="Paly home">
            <img src="/paly-mark.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="font-display font-bold tracking-tight text-paly-950">Paly</span>
          </a>

          <div className="flex items-center gap-6 text-sm text-paly-950/45">
            {DISCORD_INVITE_URL ? (
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-200 hover:text-paly-700"
              >
                Discord
              </a>
            ) : null}
            <a href="/privacy-policy.html" className="transition-colors duration-200 hover:text-paly-700">
              Privacy
            </a>
            <a href="/terms-of-service.html" className="transition-colors duration-200 hover:text-paly-700">
              Terms
            </a>
          </div>

          <p className="text-sm text-paly-950/30">
            &copy; {new Date().getFullYear()} Paly
          </p>
        </div>
      </div>
    </footer>
  );
}

import { APP_STORE_URL, DISCORD_INVITE_URL, PLAY_STORE_URL } from '../config';

export default function Footer() {
  const storeLinks = [
    {
      label: 'Download for iOS',
      url: APP_STORE_URL,
      className: 'bg-white text-paly-900 hover:bg-paly-50',
    },
    {
      label: 'Download for Android',
      url: PLAY_STORE_URL,
      className: 'border border-white/20 text-white hover:bg-white/10',
    },
  ].filter((link) => link.url);

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* CTA banner */}
        <div className="glass-card-dark p-10 sm:p-14 text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Ready to stop cramming?
          </h2>
          <p className="mt-4 text-lg text-paly-200/80 max-w-lg mx-auto">
            Download Paly and let it handle the studying. You just show up to class.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {storeLinks.length > 0 ? (
              storeLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-8 py-4 font-semibold rounded-2xl transition-colors ${link.className}`}
                >
                  {link.label}
                </a>
              ))
            ) : (
              <p className="text-paly-200/70 font-medium">
                Coming soon to the App Store and Google Play.
              </p>
            )}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-paly-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-gray-900 font-semibold">Paly</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
              Discord
            </a>
            <a href="/privacy-policy.html" className="hover:text-gray-600 transition-colors">
              Privacy
            </a>
            <a href="/terms-of-service.html" className="hover:text-gray-600 transition-colors">
              Terms
            </a>
          </div>

          <p className="text-sm text-gray-300">
            &copy; {new Date().getFullYear()} Paly
          </p>
        </div>
      </div>
    </footer>
  );
}

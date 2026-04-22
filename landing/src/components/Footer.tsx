import { DISCORD_INVITE_URL } from '../config';

export default function Footer() {
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
            <a
              href="#"
              className="px-8 py-4 bg-white text-paly-900 font-semibold rounded-2xl hover:bg-paly-50 transition-colors"
            >
              Download for iOS
            </a>
            <a
              href="#"
              className="px-8 py-4 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors"
            >
              Download for Android
            </a>
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

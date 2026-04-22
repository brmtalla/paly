import { useState } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DISCORD_INVITE_URL } from '../config';

interface OptInModalProps {
  phone: string;
  onClose: () => void;
}

type ModalStep = 'ask' | 'form' | 'done';

export default function OptInModal({ phone, onClose }: OptInModalProps) {
  const [step, setStep] = useState<ModalStep>('ask');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOptIn = async (includeEmail: boolean) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/demo-subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phoneNumber: phone,
          email: includeEmail ? email : undefined,
          smsOptIn: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-8 animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 'ask' && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-paly-100 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-paly-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900">
              Like what you saw?
            </h3>
            <p className="mt-2 text-gray-500 leading-relaxed">
              We're launching soon. Want to get app updates and early access info
              texted directly to your number?
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setStep('form')}
                className="w-full py-3.5 bg-paly-500 hover:bg-paly-400 text-white font-semibold rounded-xl transition-colors"
              >
                Yes, keep me in the loop
              </button>
              <button
                onClick={onClose}
                className="w-full py-3.5 text-gray-400 hover:text-gray-600 font-medium transition-colors text-sm"
              >
                No thanks
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              You're in
            </h3>
            <p className="mt-2 text-gray-500 leading-relaxed">
              We'll text you updates at the number you used. Optionally, add your
              email for launch announcements too.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-gray-300 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-paly-500/30 focus:border-paly-500 transition-all disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                onClick={() => handleOptIn(!!email)}
                disabled={submitting}
                className="w-full py-3.5 bg-paly-500 hover:bg-paly-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
              >
                {submitting ? 'Saving...' : 'Subscribe'}
              </button>

              <button
                onClick={() => handleOptIn(false)}
                disabled={submitting}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip email, just text me
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900">
              You're on the list
            </h3>
            <p className="mt-2 text-gray-500 leading-relaxed">
              We'll keep you posted on launch updates and early access.
              In the meantime, come hang out with us:
            </p>

            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2.5 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Join the Paly Discord
            </a>

            <button
              onClick={onClose}
              className="mt-4 block mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

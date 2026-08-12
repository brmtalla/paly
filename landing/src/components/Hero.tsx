import PhoneMockup from './PhoneMockup';

const PROOF = [
  { stat: '5 min', label: 'from slides to study plan' },
  { stat: 'Daily', label: 'chunks, spaced between classes' },
  { stat: '80%', label: 'quiz pass to keep your streak' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Layered background. Kept behind aria-hidden so screen readers skip it. */}
      <div aria-hidden="true" className="absolute inset-0 bg-paly-950" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(48,98,198,0.55),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-40 top-40 h-[32rem] w-[32rem] rounded-full bg-teal-500/10 blur-3xl animate-aurora"
      />
      <div
        aria-hidden="true"
        className="absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-amber-400/10 blur-3xl animate-aurora"
        style={{ animationDelay: '-6s' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(70% 60% at 50% 0%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 0%, black, transparent)',
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2.5" aria-label="Paly home">
          <img src="/paly-mark.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="font-display text-xl font-extrabold tracking-tight text-white">Paly</span>
        </a>
        <nav className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="hidden text-sm font-medium text-paly-200 transition-colors duration-200 hover:text-white sm:block"
          >
            How it works
          </a>
          <a
            href="#demo"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all duration-200 ease-out-quart hover:bg-white/20"
          >
            Try the demo
          </a>
        </nav>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 pb-28 pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-20">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-paly-100 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Now in early access
          </div>

          <h1 className="animate-fade-in-up stagger-1 mt-7 font-display text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]">
            Study without
            <br />
            <span className="bg-gradient-to-r from-teal-300 via-paly-200 to-amber-300 bg-clip-text text-transparent">
              cramming.
            </span>
          </h1>

          <p className="animate-fade-in-up stagger-2 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-paly-100/80 lg:mx-0">
            Upload your lecture slides once. Your companion breaks them into
            bite-sized pieces and texts you one a day between classes — so the
            night before an exam stops being the whole plan.
          </p>

          <div className="animate-fade-in-up stagger-3 mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#demo"
              className="w-full rounded-2xl bg-white px-7 py-4 text-center font-semibold text-paly-900 shadow-lift transition-all duration-200 ease-out-quart hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
            >
              Try it free — upload a PDF
            </a>
            <a
              href="#how-it-works"
              className="w-full rounded-2xl px-7 py-4 text-center font-medium text-paly-200 transition-colors duration-200 hover:text-white sm:w-auto"
            >
              See how it works
            </a>
          </div>

          <dl className="animate-fade-in-up stagger-4 mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-7">
            {PROOF.map((item) => (
              <div key={item.label}>
                <dt className="font-display text-xl font-bold text-white sm:text-2xl">
                  {item.stat}
                </dt>
                <dd className="mt-1 text-xs leading-snug text-paly-200/70 sm:text-sm">
                  {item.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Device */}
        <div className="animate-fade-in-up stagger-3 lg:animate-float">
          <PhoneMockup />
        </div>
      </div>

      {/* Fade into the page below */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-primary to-transparent"
      />
    </section>
  );
}

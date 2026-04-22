export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-paly-950 via-paly-900 to-paly-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-paly-500/20 via-transparent to-transparent" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-paly-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">Paly</span>
        </div>
        <a
          href="#demo"
          className="text-sm text-paly-200 hover:text-white transition-colors font-medium"
        >
          Try the demo
        </a>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-paly-200 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Now in early access
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.08] animate-fade-in-up stagger-1">
          Study without
          <br />
          <span className="bg-gradient-to-r from-paly-300 via-paly-400 to-violet-400 bg-clip-text text-transparent">
            cramming.
          </span>
        </h1>

        <p className="mt-7 text-lg sm:text-xl text-paly-200/90 max-w-2xl mx-auto leading-relaxed animate-fade-in-up stagger-2">
          Upload your lecture slides. Paly synthesizes them and texts you
          bite-sized study material every day — so you're always prepared,
          never panicking.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-3">
          <a
            href="#demo"
            className="px-8 py-4 bg-paly-500 hover:bg-paly-400 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-paly-500/25 hover:shadow-paly-400/30 hover:-translate-y-0.5"
          >
            Try it free — upload a PDF
          </a>
          <a
            href="#how-it-works"
            className="px-8 py-4 text-paly-300 hover:text-white font-medium transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Floating phone mockup hint */}
        <div className="mt-20 animate-fade-in-up stagger-4">
          <div className="mx-auto w-64 sm:w-72">
            <div className="glass-card-dark p-5 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-paly-500/30 flex items-center justify-center">
                  <span className="text-paly-300 text-sm">P</span>
                </div>
                <div>
                  <p className="text-white/90 text-sm font-medium">Paly</p>
                  <p className="text-white/40 text-xs">iMessage</p>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Hey! Here's your study chunk for Bio 101 today:
              </p>
              <p className="text-paly-300 text-sm mt-2 leading-relaxed">
                • MITOSIS: Cell division producing two identical daughter cells...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-primary to-transparent" />
    </section>
  );
}

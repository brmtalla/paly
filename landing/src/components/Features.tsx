const features = [
  {
    title: 'AI-powered synthesis',
    description:
      'Paly reads your lectures and distills them into summaries, flashcards, quiz questions, and daily study chunks.',
    gradient: 'from-paly-500 to-violet-500',
  },
  {
    title: 'Texts, not notifications',
    description:
      'Study prompts arrive via iMessage — the one app you actually check. No more ignored push notifications.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Spaced repetition, automated',
    description:
      'Content is drip-fed from your upload date until your next class. Knowledge compounds without effort.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    title: 'Built for your schedule',
    description:
      "Tell Paly when you're free and when your classes meet. It schedules study prompts around your real life.",
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    title: 'Quizzes that matter',
    description:
      'Before each class, a mandatory quiz checks your knowledge. Pass it and keep your streak going.',
    gradient: 'from-cyan-500 to-sky-500',
  },
  {
    title: 'Zero friction',
    description:
      "Upload once after class. That's your only job. Paly handles synthesis, scheduling, and delivery.",
    gradient: 'from-violet-500 to-fuchsia-500',
  },
];

export default function Features() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Everything you need to stop cramming
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Paly is a system that studies for you — quietly, consistently, and personally.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/50 hover:-translate-y-0.5"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-sm`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white/90" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

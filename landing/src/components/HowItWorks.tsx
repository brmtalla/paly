import SectionHeading from './SectionHeading';

const steps = [
  {
    title: 'Upload your slides',
    description:
      'Drop your lecture PDF, PowerPoint, or notes into Paly after class. Takes about ten seconds.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    ),
  },
  {
    title: 'Paly breaks it down',
    description:
      'It reads the material and splits it into daily chunks, flashcards, and a quiz — sized to the gap before your next class.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
      />
    ),
  },
  {
    title: 'One lands each day',
    description:
      'A single chunk arrives as a notification — or as a text, if you are on Pro. Two minutes between classes is enough.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    ),
  },
  {
    title: 'Pass the quiz, keep the streak',
    description:
      'Before the next class a short quiz checks it stuck. Score 80% and your streak — and the next batch — keeps coming.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-[0.85fr_1fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title={
              <>
                Four steps, then it
                <br className="hidden sm:block" /> runs itself.
              </>
            }
            body="Setup takes about a minute. After that the only thing you do is upload the next lecture."
          />
        </div>

        {/* Stepped rail — the connecting line is what makes this read as a
            sequence rather than four unrelated cards. */}
        <ol className="relative space-y-10">
          <div
            aria-hidden="true"
            className="absolute bottom-6 left-[1.4rem] top-6 w-px bg-gradient-to-b from-paly-200 via-paly-200 to-transparent"
          />

          {steps.map((step, i) => (
            <li key={step.title} className="group relative flex gap-6">
              <div className="relative z-10 flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-paly-50 text-paly-600 ring-1 ring-paly-100 transition-all duration-200 ease-out-quart group-hover:bg-paly-600 group-hover:text-white group-hover:ring-paly-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  {step.icon}
                </svg>
              </div>

              <div className="pt-1">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-paly-400">
                  Step {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1.5 font-display text-lg font-bold text-paly-950">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-paly-950/55">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

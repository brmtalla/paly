import SectionHeading from './SectionHeading';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  /** The lead card spans the row on desktop, giving the grid a focal point. */
  wide?: boolean;
}

const icon = (d: string) => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const features: Feature[] = [
  {
    wide: true,
    title: 'It reads the lecture so you do not have to twice',
    description:
      'Upload the slides once. Paly pulls out the summary, the takeaways worth remembering, flashcards, and a quiz — then spaces them across the days until your next class.',
    icon: icon(
      'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z'
    ),
  },
  {
    title: 'Where you already look',
    description:
      'Chunks arrive as notifications on every plan. On Pro they land in your Messages thread instead — the app you actually open.',
    icon: icon(
      'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z'
    ),
  },
  {
    title: 'Spacing, handled',
    description:
      'Material is drip-fed from upload day to class day. You get the spacing effect without building a schedule for it.',
    icon: icon(
      'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'
    ),
  },
  {
    title: 'Around your actual week',
    description:
      'Tell Paly when your classes meet and when you are free. Nothing arrives at 3am or in the middle of a lecture.',
    icon: icon(
      'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5'
    ),
  },
  {
    title: 'A quiz with teeth',
    description:
      'Score 80% before the next class to keep your streak. Miss it and delivery pauses until you pass — the deadline is the point.',
    icon: icon('M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
  },
];

// The lead card spans two columns, so the count has to leave no orphan: 2 + 4
// single cards fills exactly two rows of three. Adding a sixth feature would
// strand one card alone on a third row.

export default function Features() {
  return (
    <section className="bg-surface-secondary py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="What you get"
          title="A system, not another app to keep up with"
          body="Paly is meant to be forgotten about. It works whether or not you remember to open it."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`group rounded-2xl border border-paly-950/[0.07] bg-white p-6 transition-all duration-200 ease-out-quart hover:-translate-y-1 hover:border-paly-200 hover:shadow-lift ${
                feature.wide ? 'lg:col-span-2 lg:p-8' : ''
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paly-50 text-paly-600 ring-1 ring-paly-100 transition-colors duration-200 group-hover:bg-paly-600 group-hover:text-white group-hover:ring-paly-600">
                {feature.icon}
              </div>

              <h3
                className={`mt-5 font-display font-bold text-paly-950 ${
                  feature.wide ? 'text-xl sm:text-2xl' : 'text-base'
                }`}
              >
                {feature.title}
              </h3>
              <p
                className={`mt-2 leading-relaxed text-paly-950/55 ${
                  feature.wide ? 'text-base max-w-xl' : 'text-sm'
                }`}
              >
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

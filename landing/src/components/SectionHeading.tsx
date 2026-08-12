interface Props {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  align?: 'center' | 'left';
  tone?: 'light' | 'dark';
}

/**
 * One heading treatment for every section. Previously each section rolled its
 * own sizes and greys, which is why the page read as a stack of unrelated
 * templates rather than one document.
 */
export default function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'center',
  tone = 'light',
}: Props) {
  const dark = tone === 'dark';

  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <span
        className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${
          dark ? 'text-teal-300' : 'text-paly-600'
        }`}
      >
        <span className={`h-1 w-1 rounded-full ${dark ? 'bg-teal-300' : 'bg-paly-600'}`} />
        {eyebrow}
      </span>

      <h2
        className={`mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-[2.6rem] sm:leading-[1.1] ${
          dark ? 'text-white' : 'text-paly-950'
        }`}
      >
        {title}
      </h2>

      {body && (
        <p
          className={`mt-4 text-lg leading-relaxed ${
            dark ? 'text-paly-100/70' : 'text-paly-950/55'
          }`}
        >
          {body}
        </p>
      )}
    </div>
  );
}

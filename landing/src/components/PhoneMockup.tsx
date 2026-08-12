import { useEffect, useRef, useState } from 'react';

/**
 * The companion's name is user-chosen in the app (profiles.assistant_name), so
 * the landing thread shows a named one rather than the default to make the
 * personalisation obvious. Change this and the header follows.
 */
const COMPANION = 'Athena';

interface Message {
  from: 'them' | 'me';
  text: string;
  /** Rendered as the app formats a study chunk, not as prose. */
  chunk?: { label: string; className: string };
  /** How long the typing indicator shows before this lands, in ms. */
  typingFor?: number;
}

const THREAD: Message[] = [
  {
    from: 'them',
    typingFor: 900,
    chunk: { label: 'Key Takeaway · Day 2', className: 'Organic Chemistry II' },
    text: 'STEREOCENTRES: a carbon with four different groups attached. That one feature is what makes a molecule chiral — impossible to superimpose on its own mirror image.',
  },
  { from: 'me', text: 'wait so diastereomers arent mirror images?' },
  {
    from: 'them',
    typingFor: 1100,
    text: "Right — enantiomers are the mirror images. Diastereomers differ at some stereocentres but not all, so their melting points and solubility actually differ. That's the bit the quiz will go after 👀",
  },
  { from: 'me', text: 'ok that finally clicked' },
  {
    from: 'them',
    typingFor: 700,
    text: "Nice. That's 4 days in a row — I'll send Thursday's before class 🔥",
  },
];

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function PhoneMockup() {
  // -1 so nothing is shown until the thread starts playing.
  const [shown, setShown] = useState(-1);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Once someone scrolls up to read, yanking them back to the bottom every time
  // a message lands is worse than letting the new one arrive off-screen.
  const pinnedToBottom = useRef(true);

  // Only start once the phone is actually on screen — an animation that plays
  // to nobody is just wasted battery.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setShown(THREAD.length - 1);
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || prefersReducedMotion()) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const play = (index: number) => {
      if (cancelled || index >= THREAD.length) return;
      const message = THREAD[index];

      const reveal = () => {
        if (cancelled) return;
        setTyping(false);
        setShown(index);
        // A beat to read before the next one arrives.
        timers.push(setTimeout(() => play(index + 1), message.from === 'me' ? 700 : 1600));
      };

      if (message.typingFor) {
        setTyping(true);
        timers.push(setTimeout(reveal, message.typingFor));
      } else {
        timers.push(setTimeout(reveal, 350));
      }
    };

    timers.push(setTimeout(() => play(0), 400));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [started]);

  // Keep the newest message in view as the thread grows — but only while the
  // visitor is still at the bottom. Once they scroll up to re-read something,
  // dragging them back down every time a message lands is worse than letting
  // the new one arrive off-screen.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinnedToBottom.current) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [shown, typing]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Smooth scrolling lands a pixel or two short, so this needs slack rather
    // than an exact comparison.
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  return (
    <div ref={frameRef} className="relative mx-auto w-[300px] sm:w-[340px]">
      {/* Glow behind the device */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-[4rem] bg-gradient-to-tr from-paly-500/30 via-teal-500/20 to-amber-400/20 blur-3xl animate-aurora"
      />

      {/* Device */}
      <div className="relative rounded-[3rem] bg-paly-950 p-2.5 shadow-phone ring-1 ring-white/15">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-white">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-2.5 z-20 h-7 w-24 -translate-x-1/2 rounded-full bg-paly-950" />

          {/* Status bar */}
          <div className="flex items-center justify-between px-7 pb-1 pt-3.5 text-[11px] font-semibold text-paly-950">
            <span>9:41</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="inline-block h-2.5 w-4 rounded-[2px] bg-paly-950/80" />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-paly-950/80" />
              <span className="inline-block h-2.5 w-5 rounded-[3px] border border-paly-950/70" />
            </span>
          </div>

          {/* Conversation header */}
          <div className="flex flex-col items-center gap-1 border-b border-black/5 px-4 pb-3 pt-2">
            <img
              src="/paly-mark.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full bg-paly-50 object-contain p-1"
            />
            <p className="text-[13px] font-semibold text-paly-950">{COMPANION}</p>
          </div>

          {/* Thread */}
          {/* Scrollable like the real thread it is imitating. `overscroll-contain`
              stops a flick inside the phone from scrolling the page out from
              under it, and the scrollbar is hidden because iOS has none. */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            tabIndex={0}
            role="log"
            className="h-[380px] space-y-2 overflow-y-auto overscroll-contain px-3.5 py-4 [scrollbar-width:none] focus-visible:outline-none sm:h-[420px] [&::-webkit-scrollbar]:hidden"
            aria-label={`Example conversation with ${COMPANION}`}
          >
            {THREAD.map((message, i) => {
              if (i > shown) return null;
              const mine = message.from === 'me';

              return (
                <div
                  key={i}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  style={{ animationFillMode: 'both' }}
                >
                  <div
                    className={[
                      'animate-bubble-in max-w-[85%] rounded-[18px] px-3.5 py-2 text-[13px] leading-snug',
                      mine
                        ? 'rounded-br-md bg-imessage text-white'
                        : 'rounded-bl-md bg-[#E9E9EB] text-paly-950',
                    ].join(' ')}
                  >
                    {message.chunk && (
                      <span className="mb-1.5 block">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-paly-600">
                          {message.chunk.label}
                        </span>
                        <span className="block text-[11px] font-medium text-paly-950/60">
                          {message.chunk.className}
                        </span>
                      </span>
                    )}
                    {message.text}
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="flex justify-start">
                <div
                  className="animate-bubble-in flex items-center gap-1 rounded-[18px] rounded-bl-md bg-[#E9E9EB] px-4 py-3"
                  aria-label={`${COMPANION} is typing`}
                >
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-paly-950/45"
                      style={{
                        animation: 'typing-dot 1.3s cubic-bezier(0.45, 0, 0.55, 1) infinite',
                        animationDelay: `${d * 0.16}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-black/5 px-3.5 py-3">
            <div className="flex-1 rounded-full border border-black/10 px-3.5 py-1.5 text-[13px] text-paly-950/35">
              iMessage
            </div>
            <div
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-imessage text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-2 pt-1">
            <div className="h-1 w-28 rounded-full bg-paly-950/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

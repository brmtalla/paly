# LinkedIn Company Page — Paly

Paste-ready copy for creating the page at
**linkedin.com/company/setup/new**. Every field below is inside LinkedIn's
character limits, which are noted so edits stay safe.

---

## Identity

| Field                   | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Name**                | `Paly`                                                                                      |
| **LinkedIn public URL** | `linkedin.com/company/paly-study`                                                           |
| **Website**             | `https://www.paly.study`                                                                    |
| **Industry**            | E-Learning Providers                                                                        |
| **Company size**        | 0-1 employees                                                                               |
| **Company type**        | Privately Held                                                                              |
| **Location**            | Set to your city — LinkedIn requires one, and pages without a location rank worse in search |

> **On the URL:** "Paly" is the long-standing nickname for Palo Alto High School,
> so `/company/paly` is probably taken and would compete with that school for
> every search of the bare word. `paly-study` matches the domain and keeps the
> two apart. Fallbacks if it is gone: `palystudy`, `paly-app`, `getpaly`.

---

## Tagline

Max 120 characters. This one is 103.

```
Study without cramming. Paly turns your lecture notes into daily study prompts, quizzes, and flashcards.
```

---

## About

Max 2,000 characters. This one is roughly 1,000, which is deliberate — the page
truncates after about 250 characters with a "see more", so the first two lines
carry the pitch.

```
Paly turns the notes you already take into a week of studying you'll actually do.

Add your classes and your schedule, upload your lecture slides or type your notes, and Paly's AI breaks the material into small daily study prompts, flashcards, and quizzes — then delivers them across the days between classes, while the lecture is still fresh.

The premise is simple: most students don't struggle because they don't care. They struggle because reviewing is easy to postpone until the night before. Paly removes the decision. The material shows up on its own, in pieces small enough to actually finish, spaced the way memory works.

With Paly Pro, study chunks arrive as texts in your Messages thread — and you can text questions back to Athena, your study assistant, about anything she has already sent you. No new app to open, no new habit to build.

Built for students who would rather learn gradually than cram.

Paly is available on iPhone.
```

---

## Specialties

Up to 20, each 80 characters max. Add these one at a time:

```
Spaced repetition
Active recall
AI flashcard generation
Quiz generation
Lecture note synthesis
Study scheduling
Student productivity
EdTech
Mobile learning
Exam preparation
SMS learning
iOS apps
```

---

## Images

| Asset     | Spec                            | Use                                                          |
| --------- | ------------------------------- | ------------------------------------------------------------ |
| **Logo**  | 300x300 px min, PNG, under 4 MB | `assets/icon.png` — 1024x1024, LinkedIn downsizes it cleanly |
| **Cover** | 1128x191 px                     | `marketing/linkedin-cover.png` — built to exact size         |

The cover is deliberately sparse. LinkedIn overlays the logo avatar on the
**bottom-left** of the cover, so the leftmost ~260 px is kept empty; the avatar
fills it on the live page. The wordmark and supporting line start after that, and
the three teal bars sit at x=980 with the text ending at x=957, so nothing
collides. Colours are the brand navies (`paly-950` through `paly-600`) with the
logo's teal as the accent.

Regenerate it with the script in git history if the wording changes — the text is
drawn, not live, so edits mean re-rendering.

---

## Buttons and links

- **Custom button:** "Visit website" → `https://www.paly.study`
- Add the Discord as a featured link once the page is live: `https://discord.gg/fs3UzdvKta`
- Once the App Store listing is public, put the App Store URL in the About text
  as well — LinkedIn does not linkify it, but people copy it.

---

## First post — use this one now

The app is not on the App Store yet, so nothing here claims it is. LinkedIn
suppresses pages that have never posted, so this goes up as soon as the page
exists rather than waiting for the launch.

```
Every student I know studies the same way I did: nothing for two weeks, then everything the night before.

It's not laziness. Lectures have a time. Assignments have a due date. Reviewing has neither — so it loses to everything that does.

That's the whole idea behind Paly. Upload your notes or your lecture slides, and it breaks them into small pieces spread across the days between your classes. Not a study plan you have to stick to. Material that shows up on its own, small enough to actually finish, while the lecture is still fresh.

With Paly Pro it arrives as texts, and you can text questions back.

Building it solo. Coming to iPhone shortly.

paly.study
```

The hook is written to survive LinkedIn's ~200-character truncation: the cut
lands just after "It's not laziness," which is the line that earns the tap on
"see more". No hashtags and no "excited to announce" — founder posts shaped like
press releases get scrolled.

---

## Launch post — only once 1.0 is actually live

Swap the last two lines for the App Store link. Do not post this until the
listing is public; the previous draft claimed availability while the app was
still in review, which is the kind of thing people check.

```
Paly is live on the App Store.

Every student I know studies the same way I did: nothing for two weeks, then everything the night before. Not laziness — reviewing is the only part of school with no deadline, so it loses to everything that has one.

Paly turns the notes you already take into small daily pieces, spread across the days between your classes. With Pro they arrive as texts, and you can text questions back.

If you're a student, I'd genuinely like to know whether it changes anything about how your week goes.

<App Store link>
```

---

## Setup order

1. Create the page (needs your personal LinkedIn; you attest you represent Paly).
2. Logo, then Tagline, then About, then Specialties.
3. Set the custom button.
4. Add the cover once it exists.
5. Publish the first post — after App Review clears.
6. Invite connections. LinkedIn grants credits based on your own network, and
   the first ~50 followers are what make the page stop looking empty.

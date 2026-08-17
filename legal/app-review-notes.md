# App Review Information → Notes

Paste the block below into App Store Connect → your app → **App Review
Information → Notes**, and keep it there for every future submission. Apple's
2.1 rejection was a request for exactly these eight items.

The demo account password is not in this file or anywhere in the repo — it lives
in App Store Connect and in the scratchpad note handed over separately.

---

## Paste from here

**1. Screen recording**

Attached / linked: [PASTE LINK]. Recorded on a physical [DEVICE] running iOS
[VERSION]. It begins at app launch and covers: account registration, sign-in,
adding a class with its weekly schedule, uploading a lecture PDF, the AI
synthesis result, a daily study chunk, the pre-class quiz, the subscription
paywall with pricing and trial terms, and account deletion from Settings.

**2. Devices and OS versions tested**

[FILL IN — e.g. "iPhone 15 Pro, iOS 26.1" — list every physical device the
build was run on. Do not list a device you did not actually test on.]

**3. What the app does, and for whom**

Paly is a study companion for university and high-school students.

The problem: students cram the night before an exam, which is the worst way to
retain anything. Spacing material out across the days before a class works far
better, but building and following that schedule by hand is more work than
students will realistically do.

Paly does it for them. A student adds their classes and weekly timetable, then
uploads lecture slides or notes (PDF, DOCX, PPTX) after each class. The app
analyses that material and produces a summary, key takeaways, flashcards, a
quiz, and a set of short daily study chunks — then schedules those chunks across
the free days before that class next meets, at times the student says they are
available. Each chunk arrives as a push notification. Before the next class the
student must pass a short quiz on the material; failing to pass pauses further
delivery until they do, which is what keeps the habit honest.

Target audience: students aged 16+ enrolled in courses with recurring classes.

**4. Setting up and reaching the main features**

Demo account (also entered in the Sign-In Information fields above):

  Email:    brandonmtalla+appreview@gmail.com
  Password: [as entered in the Sign-In Information fields]

This account is pre-populated so no setup is required: 2 classes with weekly
schedules, 2 lecture notes, one fully synthesized set (summary, 5 key takeaways,
6 flashcards, 5 quiz questions, 4 daily study chunks), 5 study prompts, and a
4-day streak.

Navigation after signing in:

- **Study tab** — the delivered study chunks. Tap one to read it in full.
- **Classes tab** — the two classes and their schedules. Open a class to see its
  synthesized content, flashcards, and quiz.
- **Upload** — inside a class, "Upload material" accepts a PDF, DOCX, or PPTX.
  A sample lecture PDF is attached to this submission if you would like to
  exercise synthesis end to end; any lecture-style PDF works. Synthesis takes
  roughly 60–100 seconds and the screen shows progress throughout.
- **Quiz** — inside a class, "Take quiz". 80% is a pass.
- **Settings → Subscription** — the paid plans (see item 8).
- **Settings → Delete Account** — permanent deletion of the account and all its
  data, per Guideline 5.1.1(v).

No permission is required to use the app. The only system prompt is the standard
notification permission request during onboarding; declining it leaves every
feature reachable in the app itself.

**5. External services used**

- **Supabase** — authentication, PostgreSQL database, and file storage for
  uploaded lecture material. Data is stored in the US.
- **Anthropic (Claude)** — the AI service that reads uploaded lecture material
  and generates the summaries, takeaways, flashcards, quizzes, and daily study
  chunks. Called only from our own server, never from the device.
- **RevenueCat** — subscription purchase management and entitlement state. All
  purchases themselves go through Apple In-App Purchase; RevenueCat does not
  process payments.
- **SendBlue** — iMessage/SMS delivery, used only by Paly Pro subscribers who
  explicitly opt in by texting a code from their own handset. Not exercised by
  this review.
- **Expo Push Notification service (APNs)** — delivery of the daily study
  notifications.

There is no advertising SDK, no analytics SDK, and no App Tracking Transparency
prompt, because the app does not track users across apps or websites.

**6. Regional differences**

None. The app's features and content are identical in every region and it is
offered in English only. Both subscriptions are available in all 175 App Store
regions at Apple's standard price tiers. There is no geographic gating, no
region-specific content, and no feature that behaves differently by country.

**7. Regulated industry / third-party material**

Paly is not in a regulated industry and provides no protected third-party
content. It is a personal study tool: the only material it processes is the
student's own class notes and lecture files, uploaded by that student for their
own private use. Nothing is shared between accounts, published, or made
available to any other user — every synthesized item is visible only to the
account that uploaded the source.

To be conservative about copyright in the lecture files students upload, the
original file is deleted from storage as soon as synthesis finishes, and the
extracted raw text is cleared with it. Only the derived study material remains,
and only in the uploading student's own account.

**8. In-App Purchase — what is sold and where to find it**

The app sells one auto-renewing subscription, **Paly Pro**, in two durations:

- **Paly Pro Monthly** (`paly_pro_monthly`) — $9.99 / month
- **Paly Pro Annual** (`paly_pro_annual`) — $69.99 / year

Both include a 7-day free trial for customers who have not used one before.

Free accounts keep the core product: up to 2 classes, AI synthesis, daily study
chunks in the app, push notification delivery, and the pre-class quizzes.

Paly Pro adds: delivery of those same chunks to the student's Messages thread,
the ability to reply to a chunk with a question and get an answer drawn from
their own uploaded material, flashcards, pulling the next chunk early on demand,
and unlimited classes.

**How to reach the purchase, two ways:**

1. **Settings tab → Subscription.** Shows both plans with title, duration,
   price, and trial terms, plus Restore Purchases and links to the Terms of Use
   and Privacy Policy. Tap "Try 7 Days Free" (or "Get Paly Pro") to open the
   purchase sheet.
2. **End of onboarding.** The paywall is presented once as the final onboarding
   step, and can be dismissed to continue on the free plan.

Terms of Use: https://paly-legal.vercel.app/terms-of-service.html
Privacy Policy: https://paly-legal.vercel.app/privacy-policy.html

## Paste to here

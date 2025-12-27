# Paly — Press Release & FAQ

---

## 📣 Press Release

**For Immediate Release**

### Introducing Paly: The Study Companion That Studies *With* You — Not Just Before Finals

College students don’t fail because they’re incapable. They fail because studying gets postponed until panic sets in. Paly fixes that.

Paly is a mobile study companion that quietly integrates learning into a student’s daily life. Instead of relying on willpower or rigid study schedules, Paly delivers short, personalized study prompts throughout the week — directly tied to each class a student is enrolled in.

Students input their class schedule, upload lecture materials, and take notes as usual. From there, Paly synthesizes those materials into daily bite-sized takeaways and sends them to the student at unpredictable but appropriate times — reinforcing learning through spaced repetition, recall, and context switching.

No cramming. No guilt. Just steady retention.

Paly feels less like an app and more like a personal study companion — with a name, a voice, and a visual identity that belongs uniquely to each user.

---

## ❓ FAQ

---

### 1. What problem does Paly solve?

Students overwhelmingly cram. Traditional study tools depend on motivation, discipline, and planning — all of which break down during a busy semester.

Paly removes the need to “decide to study” by:

* Prompting engagement automatically
* Breaking content into daily, digestible pieces
* Reinforcing knowledge continuously instead of once per unit

**Technology used:**

* Behavioral scheduling logic (custom backend service)
* Spaced repetition algorithms
* Expo Push Notifications + SMS fallback

---

### 2. How does a student use Paly?

1. Download the app
2. Input class schedule (days, times, class names)
3. Take notes or upload class materials (PDFs, PPTs, docs)
4. Receive daily study prompts automatically

No planning. No setup after onboarding.

**Technology used:**

* Expo (React Native) for mobile app
* Expo Router for navigation
* React Hook Form for onboarding inputs
* Supabase (Postgres) for user, class, and schedule storage

---

### 3. How are study notes created and delivered?

After each class session:

* User notes + uploaded materials are processed
* Paly generates a synthesized knowledge base
* Content is split into daily sections
* Each day unlocks a new reinforcement layer

**Technology used:**

* File uploads handled via Supabase Storage
* Text extraction via server-side parsers (PDF/PPT)
* LLM-powered summarization (OpenAI-compatible API)
* Chunking + tagging logic for daily delivery

---

### 4. How does Paly decide *when* to prompt the student?

Each class receives **one prompt per day**, delivered at a **randomized time window** chosen by the user.

This randomness improves retention and prevents avoidance behavior.

**Technology used:**

* User-defined availability windows stored in database
* Server-side cron / job queue (Inngest or Temporal)
* Randomized scheduling logic within safe bounds
* Expo Push Notifications
* Optional SMS delivery via Twilio

---

### 5. Why use text messages instead of just notifications?

Unread text messages have near-100% open rates.

Paly optionally delivers study prompts via SMS so learning appears where students already pay attention — the Messages app.

**Technology used:**

* Twilio Programmable SMS
* User opt-in + STOP compliance
* Link previews pointing back to in-app content

---

### 6. Is the assistant personalized?

Yes. Each user:

* Names their assistant (e.g. “Paly”, “Athena”, or a custom name)
* Receives messages written in that assistant’s voice
* Gets a unique visual theme

This creates emotional ownership and habit formation.

**Technology used:**

* User profile fields (assistant_name, theme_color)
* Dynamic copy generation via LLM prompts
* Theming via React Native context + design tokens

---

### 7. How does the personalized color system work?

On first launch, Paly assigns the user a color from a curated palette.
That color becomes their app identity.

**Technology used:**

* Predefined accessible color scale
* Randomized assignment at signup
* Stored in user profile
* Applied globally via theme provider

---

### 8. What does a daily study prompt look like?

Each prompt is intentionally lightweight:

* 1 key takeaway
* 1 reinforcing example or question
* Optional tap to read more

Designed to take **2–5 minutes max**.

**Technology used:**

* Prompt templates stored server-side
* LLM-generated variations to avoid repetition
* Deep linking into Expo app content

---

### 9. How does Paly avoid notification fatigue?

* Strict daily limits (1 per class)
* Randomized timing
* Snooze and pause controls
* Micro-content instead of long sessions

**Technology used:**

* Notification preference model
* Rate limiting logic
* User-controlled availability windows

---

### 10. Is this an Expo app?

Yes. Paly is built entirely with Expo.

**Core stack:**

* Expo (managed workflow)
* React Native
* Expo Notifications
* Expo SecureStore
* Supabase (Auth, DB, Storage)
* LLM API (OpenAI-compatible)
* Inngest / Temporal for background jobs
* Twilio for SMS delivery

---

### 11. Is Paly free?

Paly uses a freemium model:

* Free: in-app prompts + notifications
* Paid: SMS delivery, advanced synthesis, exam mode

**Technology used:**

* Stripe for subscriptions
* Feature flags via backend

---

### 12. Why is Paly different from other study apps?

Other apps:

* Wait for you to open them
* Depend on motivation
* Feel heavy and academic

Paly:

* Comes to you
* Fits into daily life
* Feels personal
* Builds memory gradually

Paly doesn’t ask students to be disciplined.
It builds discipline *around* them.

---

**Paly — Study without cramming. Learn without trying.**

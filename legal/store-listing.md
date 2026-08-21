# Paly - App Store Listing Copy

## App Name
Paly - Study Without Cramming

## Subtitle (iOS, 30 chars)
Your AI Study Companion

## Short Description (Google Play, 80 chars)
Turn your lecture notes into daily study prompts with AI. Learn consistently.

## Full Description

Stop cramming before exams. Start studying smarter.

Paly is your personal study companion that transforms your lecture notes into bite-sized, daily study content — delivered right when you need it.

**How it works:**
1. Add your classes and schedule
2. Take notes or upload lecture slides (PDF, DOCX, PPTX)
3. Paly's AI synthesizes your content into summaries, flashcards, quizzes, and daily study chunks
4. Receive personalized study prompts throughout the week as notifications — or as texts with Paly Pro
5. Complete a quiz before your next class to reinforce what you've learned

**Key Features:**
- AI-Powered Synthesis: Automatically generate flashcards, quizzes, and study summaries from your notes
- Smart Scheduling: Study prompts are spaced across the days between classes for optimal retention
- Daily Study Prompts: Bite-sized content delivered at the right time
- Pre-Class Quizzes: Mandatory review quizzes to ensure you're prepared
- Streak Tracking: Build study habits with streaks and Paly Points
- Notifications: Every plan gets each study chunk as a push notification
- Study Texts (Paly Pro): Get the same chunks delivered to your Messages thread
- Dark Mode: Study comfortably day or night

**Built for students who want to:**
- Learn gradually instead of cramming
- Actually retain what they study
- Build consistent study habits
- Stay on top of multiple classes

Paly uses spaced repetition principles to help you remember more with less effort. Upload your slides after class and let your AI companion handle the rest.

**Paly Pro subscription**
Paly is free to use. Paly Pro is an optional auto-renewing subscription that delivers your study chunks as texts and lets you text questions back to your study assistant. It is offered monthly or annually; the price in your local currency is shown in the app before you confirm. Payment is charged to your Apple ID at confirmation of purchase. Your subscription renews automatically unless cancelled at least 24 hours before the end of the current period, and your account is charged for renewal within 24 hours prior to the end of that period. Manage or cancel your subscription in Settings > [your name] > Subscriptions. Cancelling stops the next renewal and does not refund the current period.

Terms of Use (EULA): https://www.paly.study/terms
Privacy Policy: https://www.paly.study/privacy

## Keywords (iOS, 100 chars)
study,flashcards,quiz,notes,AI,spaced repetition,college,university,student,companion,reminders

## Category
Education

## Age Rating
12+ (Infrequent/Mild Mature Themes - educational content)

## Privacy Nutrition Labels (iOS)

### Data Linked to You
- Email Address (Account creation)
- Phone Number (Paly Pro study texts, optional — only recorded if the user texts us first)
- Study content (Notes, uploads)

### Data Not Linked to You
- Device identifiers (Push notification tokens)

### Data Used to Track You
- None

## App Review Notes

Paly is an educational study companion app. Key points for review:

1. **Account Required**: Users must create an account to use the app. This is necessary to sync study data across sessions and deliver personalized prompts.

2. **AI Usage**: The app uses Anthropic's Claude API to process user-uploaded educational content and generate study materials. No user data is used to train AI models.

3. **SMS Feature**: SMS study reminders are a Paly Pro feature and are entirely optional. They require double opt-in: the user must send us a text containing their account's link code from the handset they want to use, which is the only way a phone number is ever recorded. STOP/START/HELP keywords are honoured. Push notifications are the default delivery channel on every plan, so no user needs SMS to use the app.

4. **No Third-Party Tracking**: We do not use any advertising SDKs or tracking tools.

5. **Minimum Age**: The app is designed for students aged 13+.

6. **Demo Account**: Credentials are provided in App Review Information. The
   account is pre-populated with two classes and their weekly schedules, lecture
   notes, a full set of AI-generated study material (summary, flashcards, quiz,
   and daily chunks), delivered study prompts, and an active reading streak — so
   the core loop is visible immediately rather than from empty state.

7. **Onboarding step 1 ("Activate texts")**: This screen is optional and can be
   skipped with "I'll do this later" — it is not a gate. Study texts are a Paly
   Pro feature. To receive them a user texts their account's link code to our
   number from the handset they want messages on; that inbound message is the
   only way we ever record a phone number. Push notifications are the default
   delivery channel on every plan, so no reviewer action is needed to see the
   app working.

8. **Account Deletion**: Settings > Account > Delete Account permanently removes
   the account, all study data, and uploaded files, per Guideline 5.1.1(v).

---

## Heads up: this file is not what is live

The description in App Store Connect is shorter than the Full Description
above and words things differently — it was edited directly in ASC and this
file was never updated to match. **App Store Connect is the source of truth.**
Do not paste the copy above over the live description without comparing first;
it would replace the newer copy with an older draft.

The Guideline 3.1.2 fix was applied by appending the subscription block and the
two links to the live ASC description (1,033 -> 1,919 chars), leaving the rest
of the live copy untouched.

## Fixing the Guideline 3.1.2 rejection (Terms of Use link)

Apple's automated check rejected the submission because the product page offered
auto-renewable subscriptions without a functional Terms of Use (EULA) link. The
copy above now carries that link, but **the description in App Store Connect is
a separate copy and has to be updated there** — editing this file changes
nothing on the product page.

### Required, in App Store Connect

1. **App Store → (version) → Description** — replace with the Full Description
   above. The two links at the end are what the reviewer is looking for; they
   must be present and must resolve.
2. Confirm **App Store → (version) → Privacy Policy URL** is
   `https://www.paly.study/privacy`.

That is enough to clear the rejection, because it uses Apple's standard EULA and
points at our terms alongside it.

### Only if using a custom EULA instead

**App Information → License Agreement → Edit** and paste the terms text there.
Choose one path or the other — a custom agreement in that field replaces the
standard Apple EULA, and Apple checks whichever one applies.

### Deploy before resubmitting

The links resolve through rewrites in `vercel.json` (`/terms`, `/privacy`), so
they only work once the site is deployed. Load both URLs in a browser and
confirm they render before hitting Submit — a link that 404s is the same
rejection again.

### Also worth fixing while in here

The purchase screen is RevenueCat's hosted paywall (`RevenueCatUI.Paywall`), so
its footer links are set in the RevenueCat dashboard, not in this repo. Under
**Paywalls → (paywall) → Footer**, set the Terms and Privacy URLs to the two
links above. Guideline 3.1.2 wants the disclosure on the purchase screen as well
as the product page, and an empty footer there is a common second rejection.

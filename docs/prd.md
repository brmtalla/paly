# Paly — Product Requirements Document (PRD)

---

## 1. Product Overview

**Product Name:** Paly
**Platform:** iOS / Android (Expo – React Native)
**Primary Goal:** Eliminate cramming by embedding continuous, low-friction studying into students’ daily lives through personalized prompts delivered via app notifications and SMS.

Paly is a study companion, not a planner. It removes the need for motivation by automating recall and reinforcement based on a student’s real class schedule and materials.

---

## 2. Target User

### Primary Persona

* College / university students
* Heavy course loads
* Historically cram before exams
* Use iMessage constantly
* Avoid traditional study apps after week 2–3 of the semester

### Core User Problem

> “I *know* I should study earlier, but I don’t — and then I panic.”

---

## 3. Core User Journey (Happy Path)

1. User downloads Paly
2. Completes 60–90 second onboarding
3. Inputs class schedule
4. Uploads notes / slides or takes notes in-app
5. Paly synthesizes material automatically
6. User receives daily study prompts per class
7. Knowledge compounds gradually
8. Finals week arrives → no cramming

---

## 4. Onboarding Flow (Critical)

### Step 1: Welcome

* Value prop: “Study without cramming”
* CTA: “Let’s set up your classes”

**Tech:**

* Expo Router

---

### Step 2: Assistant Personalization

* Input assistant name (default: Paly)
* Explain companion concept

**Tech:**

* React Hook Form
* Supabase user profile (`assistant_name`)

---

### Step 3: Theme Assignment

* Randomly assign a color from curated palette
* Preview UI updates instantly

**Tech:**

* Theme context provider
* Stored as `theme_color`

---

### Step 4: Class Schedule Input

For each class:

* Class name
* Days of week
* Start/end time

**Tech:**

* React Native forms
* Supabase relational tables (`classes`, `class_sessions`)

---

### Step 5: Availability Windows

* User blocks unavailable times
* Used for random prompt scheduling

**Tech:**

* Time window picker
* Stored as `availability_blocks`

---

### Step 6: SMS Opt-in (Optional)

* Explain benefits
* Explicit opt-in + STOP disclaimer

**Tech:**

* SendBlue opt-in flow
* Compliance flags in DB

---

## 5. Notes & Material Intake

### In-Class Notes

* Rich text editor
* Supports typing during lecture

**Tech:**

* React Native rich text editor
* Autosave via Supabase

---

### File Uploads

* PDFs, PPTs, DOCs

**Tech:**

* Supabase Storage
* Server-side file parsers

---

## 6. Knowledge Synthesis Engine

### Trigger Conditions

* End of class session
* Manual “synthesize” action

### Processing Pipeline

1. Extract raw text
2. Normalize formatting
3. Generate master summary
4. Split into daily chunks
5. Tag concepts by class + date

**Tech:**

* Serverless functions
* LLM API (OpenAI-compatible)
* Chunking logic

---

## 7. Daily Study Prompt System

### Rules

* Max 1 prompt per class per day
* Randomized time within availability
* 2–5 minute read

### Prompt Types

* Key takeaway
* Recall question
* Applied example

**Tech:**

* Inngest or Temporal job queue
* Expo Push Notifications
* SendBlue SMS/iMessage (paid tier)

---

## 8. Prompt Delivery UX

### Notification Copy

* Conversational
* Assistant voice

### Deep Linking

* Tap opens directly to content

**Tech:**

* Expo Notifications
* Expo Linking

---

## 9. Anti-Fatigue Controls

* Snooze prompts
* Pause per class
* Global quiet mode

**Tech:**

* Notification preference model
* Backend rate limiting

---

## 10. Study Feed Screen

### Content

* Today’s prompt
* Past prompts
* Progress indicator

**Tech:**

* FlatList
* Supabase queries

---

## 11. Exam Mode (Phase 2)

* Detect upcoming exams
* Increase recall density
* Surface weak concepts

**Tech:**

* Calendar integration
* Adaptive scheduling logic

---

## 12. Monetization

### Free

* App prompts
* Limited synthesis

### Paid

* SMS delivery
* Advanced synthesis
* Exam mode

**Tech:**

* Stripe subscriptions
* Feature flags

---

## 13. Non-Goals (Important)

* No social feed
* No streaks
* No gamification loops
* No manual study planning

---

## 14. Success Metrics

* Daily open rate
* Prompt engagement rate
* Retention after week 3
* Reduced cram behavior (survey)

---

## 15. MVP Scope (Must Ship)

* Onboarding
* Class schedules
* Notes + uploads
* Synthesis
* Daily prompts
* Push notifications

---

## 16. Post-MVP Enhancements

* SMS delivery
* Exam mode
* Multi-device sync
* Voice summaries

---

## 17. Summary

Paly is not a study app.

It’s a system that studies *for* the student — quietly, consistently, and personally.

By removing the decision to study, Paly replaces panic with preparedness.

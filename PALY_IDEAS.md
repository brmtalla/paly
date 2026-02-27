# Paly Ideas

## Study Streaks (Duolingo-style)

- Whatever chunk of synthesis is generated on a given day is deemed unread (indicated with a red dot on the corner) until it's opened
- If you open (and scroll all the way to the bottom; the app will be able to tell) at least one of them every day, your streak continues
  - The psychology behind this is since they have to scroll anyways, they'll be more compelled to read and this filters out ppl who aren't serious enough to keep up the streak

## Paly Points

- For every set of notes you upload/take, Paly will generate 1 quiz on it and 1 set of flashcards
  - OR it just generates a quiz and set of flashcards every week (or just Sunday, or the user picks a time & day on the weekend)
  - Or maybe the quiz the day before class and an equal div of flashcards is generated every time the app sends the user its synthesis for the day?
- For every quiz you take and pass you get 10 paly points which goes towards you unlocking the paly pro features for free
  - 8/10 is the criteria; anything else and you don't get the points
- For every flash card you flip over (it'll show the definition first and then when you tap to flip it over, the word), you get 5
- Not breaking your streak gives you 25
- Once a user has gotten to 200 paly points that month, they unlock the pro features
- There's a bar that persists at the top of the app that shows how many points they have

## Paly Pro ($8/mo)

- Gives you access to the ability for it to send texts directly to your number
- Ability to talk to your document(s)
- Get quizzed in real time or generate flashcards
- Chatbot tutor?
  - Schedule tutor sessions at the frequency they want (or once a week?)

## UI/UX Ideas

- Add a checkbox so ppl can toggle whether or not they want the color to change every time
- Add the ability for a user to delete a class; when they do, it'll ask them if it wants them to delete the related content; they can choose to keep it or not
- Make the initial in the right corner clickable. That's where the avatar for your companion lives and it can talk you through the information you're reviewing
  - It'll generate you one using Nano Banana, you pick it and you pick it's voice
  - Make it talk using Kling AI and use ElevenLabs API for the voice

## Recording

- Add ability to record so you can record your class session and it synthesizes the notes when you're done like the notion feature

---

# Paly Flow (Envisioned)

- User onboards
- User adds their classes
- Their classes start
- User attends class
  - User takes notes in the app
  - Or/and the User uploads the pdf of their notes
  - The notes and stuff are stored in their given screen
  - The "synthesize notes" button has a **glowing animation** until it's clicked, and when it's clicked, the AI gets to work and stores the full synthesis of your notes in the cloud
  - Before the end of the day, you'll get 1 recall and 1 takeaway (if that's the frequency you chose)
    - Opening each one of these counts towards 1 paly point, but since the notif is coming in as a push, it don't reaaally matter if you don't see it
  - This process repeats every day until Sunday (the day before the next class)
- User takes the next class
  - Cycle repeats

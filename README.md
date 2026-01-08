# Paly - Study Without Cramming

Paly is a mobile study companion app that helps students learn consistently through personalized study prompts, AI-generated flashcards, and smart reminders.

## Features

- **📚 Class Schedule Management**: Input your class schedule and receive reminders
- **📝 Note Taking**: Take notes during class or upload PDFs, PPTs, and documents
- **✨ AI Synthesis**: Automatically generate summaries, flashcards, and quiz questions from your notes
- **🔔 Smart Reminders**: Receive personalized study prompts at random times throughout the day
- **🎨 Personalized Theme**: Each user gets a unique accent color for their app experience
- **🤖 Study Companion**: Name your AI companion (default: Paly) for a personal touch

## Tech Stack

- **Frontend**: Expo (React Native) with TypeScript
- **Navigation**: Expo Router v6
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: Zustand
- **UI**: Custom components with glassmorphism effects
- **Animations**: React Native Reanimated
- **AI**: OpenAI GPT-4o-mini for content synthesis
- **Notifications**: Expo Notifications

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator / Android Emulator / Physical device with Expo Go

### Installation

1. Clone the repository:
```bash
cd Paly
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator / `a` for Android emulator

### Environment Variables

The Supabase credentials are already configured in the app. For production, you should:

1. Create a `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

2. Set up OpenAI API key in Supabase Edge Functions:
```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

## Project Structure

```
Paly/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (onboarding)/      # Onboarding flow
│   ├── (tabs)/            # Main app tabs
│   └── notes/             # Note screens
├── src/
│   ├── components/        # Reusable UI components
│   │   └── ui/           # Core UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities (Supabase, notifications)
│   ├── stores/           # Zustand state stores
│   ├── theme/            # Theme configuration
│   └── types/            # TypeScript types
└── docs/                  # Documentation
```

## Database Schema

- **profiles**: User profiles with preferences
- **classes**: User's classes
- **class_sessions**: Weekly schedule for each class
- **notes**: Class notes
- **uploads**: File attachments
- **synthesized_content**: AI-generated study materials
- **study_prompts**: Daily study reminders
- **availability_blocks**: Times when user is busy

## Key Features Explained

### Onboarding Flow
1. Welcome screen with value proposition
2. Name your study companion
3. Choose your personalized theme color
4. Input your class schedule
5. Set availability windows for notifications

### Study Synthesis
When you synthesize notes, the AI generates:
- Concise summary
- Key takeaways
- Flashcards for memorization
- Multiple-choice quiz questions
- Daily study chunks

### Notification System
- Class reminders before each session
- Random daily study prompts within available hours
- Deep linking to relevant content

## License

MIT License - feel free to use this for your own projects!

## Credits

Built with ❤️ for students who want to study smarter, not harder.



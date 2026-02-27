export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          assistant_name: string;
          theme_color: string;
          phone_number: string | null;
          sms_opted_in: boolean;
          is_premium: boolean;
          stripe_customer_id: string | null;
          onboarding_completed: boolean;
          streak_count: number;
          paly_points: number;
          paly_points_month: string;
          reading_streak: number;
          last_read_date: string | null;
          auto_synthesize: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          assistant_name?: string;
          theme_color?: string;
          phone_number?: string | null;
          sms_opted_in?: boolean;
          is_premium?: boolean;
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          streak_count?: number;
          paly_points?: number;
          paly_points_month?: string;
          reading_streak?: number;
          last_read_date?: string | null;
          auto_synthesize?: boolean;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          assistant_name?: string;
          theme_color?: string;
          phone_number?: string | null;
          sms_opted_in?: boolean;
          is_premium?: boolean;
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          streak_count?: number;
          paly_points?: number;
          paly_points_month?: string;
          reading_streak?: number;
          last_read_date?: string | null;
          auto_synthesize?: boolean;
        };
      };
      classes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string | null;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          instructor_name: string | null;
          instructor_email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          instructor_name?: string | null;
          instructor_email?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          instructor_name?: string | null;
          instructor_email?: string | null;
          is_active?: boolean;
        };
      };
      class_sessions: {
        Row: {
          id: string;
          class_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          location?: string | null;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          location?: string | null;
        };
      };
      availability_blocks: {
        Row: {
          id: string;
          user_id: string;
          day_of_week: number | null;
          start_time: string;
          end_time: string;
          is_recurring: boolean;
          specific_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_of_week?: number | null;
          start_time: string;
          end_time: string;
          is_recurring?: boolean;
          specific_date?: string | null;
        };
        Update: {
          day_of_week?: number | null;
          start_time?: string;
          end_time?: string;
          is_recurring?: boolean;
          specific_date?: string | null;
        };
      };
      notes: {
        Row: {
          id: string;
          class_id: string;
          user_id: string;
          title: string | null;
          content: string | null;
          session_date: string;
          is_synthesized: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          user_id: string;
          title?: string | null;
          content?: string | null;
          session_date: string;
          is_synthesized?: boolean;
        };
        Update: {
          title?: string | null;
          content?: string | null;
          is_synthesized?: boolean;
        };
      };
      uploads: {
        Row: {
          id: string;
          note_id: string | null;
          class_id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_type: string | null;
          file_size: number | null;
          extracted_text: string | null;
          session_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id?: string | null;
          class_id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_type?: string | null;
          file_size?: number | null;
          extracted_text?: string | null;
          session_date: string;
        };
        Update: {
          file_name?: string;
          file_path?: string;
          file_type?: string | null;
          extracted_text?: string | null;
        };
      };
      synthesized_content: {
        Row: {
          id: string;
          class_id: string;
          user_id: string;
          session_date: string;
          summary: string | null;
          key_takeaways: Json;
          flashcards: Json;
          quiz_questions: Json;
          daily_chunks: Json;
          source_note_ids: string[];
          source_upload_ids: string[];
          next_class_date: string | null;
          quiz_deadline_notified: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          user_id: string;
          session_date: string;
          summary?: string | null;
          key_takeaways?: Json;
          flashcards?: Json;
          quiz_questions?: Json;
          daily_chunks?: Json;
          source_note_ids?: string[];
          source_upload_ids?: string[];
          next_class_date?: string | null;
          quiz_deadline_notified?: number;
        };
        Update: {
          summary?: string | null;
          key_takeaways?: Json;
          flashcards?: Json;
          quiz_questions?: Json;
          daily_chunks?: Json;
          next_class_date?: string | null;
          quiz_deadline_notified?: number;
        };
      };
      study_prompts: {
        Row: {
          id: string;
          user_id: string;
          class_id: string;
          synthesized_content_id: string | null;
          prompt_type: 'takeaway' | 'recall' | 'quiz' | 'flashcard';
          content: string;
          scheduled_for: string;
          delivered_at: string | null;
          read_at: string | null;
          read_at_bottom: string | null;
          delivery_method: 'push' | 'sms' | 'both';
          day_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_id: string;
          synthesized_content_id?: string | null;
          prompt_type: 'takeaway' | 'recall' | 'quiz' | 'flashcard';
          content: string;
          scheduled_for: string;
          delivered_at?: string | null;
          read_at?: string | null;
          read_at_bottom?: string | null;
          delivery_method?: 'push' | 'sms' | 'both';
          day_index?: number;
        };
        Update: {
          delivered_at?: string | null;
          read_at?: string | null;
          read_at_bottom?: string | null;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          class_id: string;
          synthesized_content_id: string | null;
          questions_answered: number;
          correct_answers: number;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_id: string;
          synthesized_content_id?: string | null;
          questions_answered?: number;
          correct_answers?: number;
          completed_at?: string | null;
        };
        Update: {
          questions_answered?: number;
          correct_answers?: number;
          completed_at?: string | null;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          push_enabled: boolean;
          sms_enabled: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          class_reminders: boolean;
          study_prompts: boolean;
          quiz_reminders: boolean;
          snooze_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          push_enabled?: boolean;
          sms_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          class_reminders?: boolean;
          study_prompts?: boolean;
          quiz_reminders?: boolean;
          snooze_until?: string | null;
        };
        Update: {
          push_enabled?: boolean;
          sms_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          class_reminders?: boolean;
          study_prompts?: boolean;
          quiz_reminders?: boolean;
          snooze_until?: string | null;
        };
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          is_active?: boolean;
        };
        Update: {
          token?: string;
          is_active?: boolean;
        };
      };
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Class = Database['public']['Tables']['classes']['Row'];
export type ClassSession = Database['public']['Tables']['class_sessions']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type Upload = Database['public']['Tables']['uploads']['Row'];
export type SynthesizedContent = Database['public']['Tables']['synthesized_content']['Row'];
export type StudyPrompt = Database['public']['Tables']['study_prompts']['Row'];
export type QuizAttempt = Database['public']['Tables']['quiz_attempts']['Row'];
export type AvailabilityBlock = Database['public']['Tables']['availability_blocks']['Row'];
export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];

// Extended types with relations
export type ClassWithSessions = Class & {
  class_sessions: ClassSession[];
};

export type NoteWithUploads = Note & {
  uploads: Upload[];
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
};

export type DailyChunk = {
  day: number;
  title: string;
  content: string;
  key_points: string[];
};



export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          assistant_name: string;
          theme_color: string;
          phone_number: string | null;
          sms_opted_in: boolean;
          // Shown during onboarding so the student can text it to us; the
          // sendblue-inbound webhook resolves it back to this account.
          sms_link_code: string;
          sms_linked_at: string | null;
          is_premium: boolean;
          stripe_customer_id: string | null;
          onboarding_completed: boolean;
          streak_count: number;
          paly_points: number;
          paly_points_month: string;
          reading_streak: number;
          last_read_date: string | null;
          auto_synthesize: boolean;
          // Server-maintained entitlement. Written only by revenuecat-webhook
          // and grant-free-month; clients are blocked by a database trigger.
          premium_until: string | null;
          free_month_granted_at: string | null;
          is_trial: boolean;
          trial_used_at: string | null;
          trial_nudge_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          assistant_name?: string;
          theme_color?: string;
          phone_number?: string | null;
          sms_opted_in?: boolean;
          sms_link_code?: string;
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
        // Only the columns a client may write. Points, streaks, entitlement,
        // billing, and the SMS identity/consent fields are maintained
        // server-side and are rejected by both a column grant and a trigger —
        // see the harden_points_and_schema and sms_link_codes migrations.
        // phone_number in particular: letting a client write it would let any
        // signed-in user point Paly's texts at a stranger's handset.
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          assistant_name?: string;
          theme_color?: string;
          onboarding_completed?: boolean;
          auto_synthesize?: boolean;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      paly_points_ledger: {
        Row: {
          id: string;
          user_id: string;
          reason: PointsReason;
          ref_id: string;
          points: number;
          created_at: string;
        };
        // Read-only from the client: rows are written only by the
        // security-definer functions below, which bypass RLS.
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      /**
       * Awards points for a verified action. The server owns the point values
       * and refuses a (reason, ref_id) pair it has already paid out.
       */
      award_paly_points: {
        Args: { p_reason: PointsReason; p_ref_id: string };
        Returns: AwardPointsResult;
      };
      /**
       * Marks a study prompt as read to the bottom and advances the reading
       * streak, awarding the daily streak bonus at most once per day.
       */
      record_chunk_read: {
        Args: { p_prompt_id: string };
        Returns: RecordChunkReadResult;
      };
      /**
       * Turns off study texts for the calling user. One-way by design: opting
       * back in needs proof the handset is theirs, which only an inbound text
       * can provide.
       */
      revoke_sms_consent: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}

export type PointsReason = 'flashcard_flip' | 'quiz_pass' | 'reading_streak';

export interface AwardPointsResult {
  awarded: boolean;
  points: number;
  total: number;
}

export interface RecordChunkReadResult extends AwardPointsResult {
  reading_streak: number;
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
export type NotificationPreferences =
  Database['public']['Tables']['notification_preferences']['Row'];

/** The subset of profile columns a client is permitted to write. */
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Insert shapes — required columns only, everything else optional.
export type ClassInsert = Database['public']['Tables']['classes']['Insert'];
export type ClassSessionInsert = Database['public']['Tables']['class_sessions']['Insert'];

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
  day?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
};

export type QuizQuestion = {
  id?: string;
  question: string;
  options: string[];
  /** Index into `options`; matches the `correct_index` key the AI emits. */
  correct_index: number;
  explanation?: string;
};

export type DailyChunk = {
  day: number;
  title: string;
  content: string;
  key_points: string[];
};

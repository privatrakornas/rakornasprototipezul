export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      exam_results: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          duration_minutes: number | null
          finished_at: string | null
          id: string
          ip_address: string | null
          name: string
          started_at: string | null
          tiu_score: number
          tkp_score: number
          total_score: number
          twk_score: number
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          duration_minutes?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          name: string
          started_at?: string | null
          tiu_score?: number
          tkp_score?: number
          total_score?: number
          twk_score?: number
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          duration_minutes?: number | null
          finished_at?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          started_at?: string | null
          tiu_score?: number
          tkp_score?: number
          total_score?: number
          twk_score?: number
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          answered_count: number
          created_at: string
          deleted_at: string | null
          device_fingerprint: string
          disqualification_reason: string | null
          duration_minutes: number | null
          finished_at: string | null
          id: string
          name: string
          started_at: string
          status: string
          tiu_score: number
          tkp_score: number
          total_questions: number
          total_score: number
          twk_score: number
          updated_at: string
        }
        Insert: {
          answered_count?: number
          created_at?: string
          deleted_at?: string | null
          device_fingerprint: string
          disqualification_reason?: string | null
          duration_minutes?: number | null
          finished_at?: string | null
          id?: string
          name: string
          started_at?: string
          status?: string
          tiu_score?: number
          tkp_score?: number
          total_questions?: number
          total_score?: number
          twk_score?: number
          updated_at?: string
        }
        Update: {
          answered_count?: number
          created_at?: string
          deleted_at?: string | null
          device_fingerprint?: string
          disqualification_reason?: string | null
          duration_minutes?: number | null
          finished_at?: string | null
          id?: string
          name?: string
          started_at?: string
          status?: string
          tiu_score?: number
          tkp_score?: number
          total_questions?: number
          total_score?: number
          twk_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          device_fingerprint: string
          email: string | null
          id: string
          instansi: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          email?: string | null
          id?: string
          instansi?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          email?: string | null
          id?: string
          instansi?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          category: string
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          option_e: string
          points_a: number | null
          points_b: number | null
          points_c: number | null
          points_d: number | null
          points_e: number | null
          question_number: number
          question_text: string
          updated_at: string
        }
        Insert: {
          category: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          option_e: string
          points_a?: number | null
          points_b?: number | null
          points_c?: number | null
          points_d?: number | null
          points_e?: number | null
          question_number: number
          question_text: string
          updated_at?: string
        }
        Update: {
          category?: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          option_e?: string
          points_a?: number | null
          points_b?: number | null
          points_c?: number | null
          points_d?: number | null
          points_e?: number | null
          question_number?: number
          question_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          answered_at: string
          category: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_number: number
          selected_answer: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          answered_at?: string
          category: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_number: number
          selected_answer?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          answered_at?: string
          category?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_number?: number
          selected_answer?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_existing_submission: {
        Args: { p_device_fingerprint?: string; p_ip_address?: string }
        Returns: boolean
      }
      get_leaderboard: {
        Args: { page_limit?: number; page_offset?: number }
        Returns: {
          created_at: string
          duration_minutes: number
          finished_at: string
          id: string
          name: string
          started_at: string
          tiu_score: number
          tkp_score: number
          total_score: number
          twk_score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

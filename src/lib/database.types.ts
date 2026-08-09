// File generato: non si modifica a mano.
// Si rigenera dopo ogni migrazione con il generatore di tipi di Supabase.

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answer_type: string
          assessment_id: string
          block_title: string
          content: string | null
          created_at: string
          help_text: string | null
          id: string
          options: string[] | null
          owner_id: string
          position: number
          question_id: string | null
          question_text: string
          updated_at: string
        }
        Insert: {
          answer_type: string
          assessment_id: string
          block_title: string
          content?: string | null
          created_at?: string
          help_text?: string | null
          id?: string
          options?: string[] | null
          owner_id: string
          position: number
          question_id?: string | null
          question_text: string
          updated_at?: string
        }
        Update: {
          answer_type?: string
          assessment_id?: string
          block_title?: string
          content?: string | null
          created_at?: string
          help_text?: string | null
          id?: string
          options?: string[] | null
          owner_id?: string
          position?: number
          question_id?: string | null
          question_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          call_date: string
          client_id: string
          completion_status: string
          condition_text: string | null
          created_at: string
          id: string
          interviewee_id: string | null
          next_step: string | null
          owner_id: string
          questionnaire_id: string | null
          questionnaire_version: number | null
          total_questions: number
          updated_at: string
          verdict: string
          verdict_reason: string | null
          verify_by: string | null
        }
        Insert: {
          call_date?: string
          client_id: string
          completion_status?: string
          condition_text?: string | null
          created_at?: string
          id?: string
          interviewee_id?: string | null
          next_step?: string | null
          owner_id: string
          questionnaire_id?: string | null
          questionnaire_version?: number | null
          total_questions?: number
          updated_at?: string
          verdict?: string
          verdict_reason?: string | null
          verify_by?: string | null
        }
        Update: {
          call_date?: string
          client_id?: string
          completion_status?: string
          condition_text?: string | null
          created_at?: string
          id?: string
          interviewee_id?: string | null
          next_step?: string | null
          owner_id?: string
          questionnaire_id?: string | null
          questionnaire_version?: number | null
          total_questions?: number
          updated_at?: string
          verdict?: string
          verdict_reason?: string | null
          verify_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_interviewee_id_fkey"
            columns: ["interviewee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          business_goals: string | null
          city: string | null
          created_at: string
          employees: number | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          province: string | null
          revenue: string | null
          sector: string | null
          source_channel: string | null
          status: string
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_goals?: string | null
          city?: string | null
          created_at?: string
          employees?: number | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          province?: string | null
          revenue?: string | null
          sector?: string | null
          source_channel?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_goals?: string | null
          city?: string | null
          created_at?: string
          employees?: number | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          province?: string | null
          revenue?: string | null
          sector?: string | null
          source_channel?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          client_id: string
          created_at: string
          decision_roles: string[]
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          last_name: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          decision_roles?: string[]
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          decision_roles?: string[]
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      question_blocks: {
        Row: {
          created_at: string
          id: string
          position: number
          questionnaire_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          questionnaire_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          questionnaire_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_blocks_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer_type: string
          block_id: string
          created_at: string
          help_text: string | null
          id: string
          is_active: boolean
          options: string[] | null
          position: number
          text: string
          updated_at: string
        }
        Insert: {
          answer_type?: string
          block_id: string
          created_at?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          options?: string[] | null
          position: number
          text: string
          updated_at?: string
        }
        Update: {
          answer_type?: string
          block_id?: string
          created_at?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          options?: string[] | null
          position?: number
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "question_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_block: {
        Args: { p_block_id: string; p_direction: string }
        Returns: boolean
      }
      move_question: {
        Args: { p_direction: string; p_question_id: string }
        Returns: boolean
      }
      open_assessment: {
        Args: {
          p_call_date?: string
          p_client_id: string
          p_interviewee_id?: string
        }
        Returns: string
      }
      renumber_questions: {
        Args: { p_questionnaire_id: string }
        Returns: undefined
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

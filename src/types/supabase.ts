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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          address: string | null
          created_at: string | null
          custom_answers: Json | null
          date_of_birth: string
          education_level: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          motivation: string | null
          phone_number: string
          program_id: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          custom_answers?: Json | null
          date_of_birth: string
          education_level?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          motivation?: string | null
          phone_number: string
          program_id?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          custom_answers?: Json | null
          date_of_birth?: string
          education_level?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          motivation?: string | null
          phone_number?: string
          program_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scores: {
        Row: {
          assessment_type: string
          created_at: string
          id: string
          rubric_id: string
          score: number
          student_id: string
          updated_at: string
        }
        Insert: {
          assessment_type: string
          created_at?: string
          id?: string
          rubric_id: string
          score: number
          student_id: string
          updated_at?: string
        }
        Update: {
          assessment_type?: string
          created_at?: string
          id?: string
          rubric_id?: string
          score?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          program_id: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          program_id?: string | null
          status: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          program_id?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_reports: {
        Row: {
          average_attendance_rate: number | null
          challenges_encountered: string | null
          cohort_id: string
          created_at: string | null
          curriculum_link: string | null
          custom_metrics: Json | null
          id: string
          mission_moment: string | null
          outcomes_reached: string | null
          participant_testimonials: string[] | null
          partners_support: string | null
          photos_link: string | null
          program_overview: string | null
          rubrics_missed: Json | null
          total_applicants: number | null
          updated_at: string | null
          volunteer_capacity: number | null
          volunteer_enrollment: number | null
          volunteer_testimonials: string[] | null
        }
        Insert: {
          average_attendance_rate?: number | null
          challenges_encountered?: string | null
          cohort_id: string
          created_at?: string | null
          curriculum_link?: string | null
          custom_metrics?: Json | null
          id?: string
          mission_moment?: string | null
          outcomes_reached?: string | null
          participant_testimonials?: string[] | null
          partners_support?: string | null
          photos_link?: string | null
          program_overview?: string | null
          rubrics_missed?: Json | null
          total_applicants?: number | null
          updated_at?: string | null
          volunteer_capacity?: number | null
          volunteer_enrollment?: number | null
          volunteer_testimonials?: string[] | null
        }
        Update: {
          average_attendance_rate?: number | null
          challenges_encountered?: string | null
          cohort_id?: string
          created_at?: string | null
          curriculum_link?: string | null
          custom_metrics?: Json | null
          id?: string
          mission_moment?: string | null
          outcomes_reached?: string | null
          participant_testimonials?: string[] | null
          partners_support?: string | null
          photos_link?: string | null
          program_overview?: string | null
          rubrics_missed?: Json | null
          total_applicants?: number | null
          updated_at?: string | null
          volunteer_capacity?: number | null
          volunteer_enrollment?: number | null
          volunteer_testimonials?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_reports_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: true
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          program_id: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          program_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          program_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          requires_pin_change: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["account_status"] | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          requires_pin_change?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["account_status"] | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          requires_pin_change?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["account_status"] | null
          username?: string | null
        }
        Relationships: []
      }
      program_assignments: {
        Row: {
          created_at: string
          id: string
          program_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          assessment_stages: string[] | null
          created_at: string | null
          curriculum_url: string | null
          description: string | null
          id: string
          intelligence_data: Json | null
          levels: string[] | null
          name: string
          registration_schema: Json | null
        }
        Insert: {
          assessment_stages?: string[] | null
          created_at?: string | null
          curriculum_url?: string | null
          description?: string | null
          id?: string
          intelligence_data?: Json | null
          levels?: string[] | null
          name: string
          registration_schema?: Json | null
        }
        Update: {
          assessment_stages?: string[] | null
          created_at?: string | null
          curriculum_url?: string | null
          description?: string | null
          id?: string
          intelligence_data?: Json | null
          levels?: string[] | null
          name?: string
          registration_schema?: Json | null
        }
        Relationships: []
      }
      rubrics: {
        Row: {
          created_at: string | null
          description: string
          id: string
          level: string
          max_score: number
          name: string
          program_id: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          level: string
          max_score?: number
          name: string
          program_id?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          level?: string
          max_score?: number
          name?: string
          program_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          age: number | null
          cohort_id: string
          created_at: string
          current_level: string
          custom_metadata: Json | null
          date_of_birth: string | null
          education_level: string | null
          email: string | null
          gender: string | null
          id: string
          motivation: string | null
          name: string
          phone_number: string | null
          program_id: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          cohort_id: string
          created_at?: string
          current_level: string
          custom_metadata?: Json | null
          date_of_birth?: string | null
          education_level?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          motivation?: string | null
          name: string
          phone_number?: string | null
          program_id?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          cohort_id?: string
          created_at?: string
          current_level?: string
          custom_metadata?: Json | null
          date_of_birth?: string | null
          education_level?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          motivation?: string | null
          name?: string
          phone_number?: string | null
          program_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_assigned_to_program: { Args: { p_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "suspended"
      assessment_period: "pre" | "mid" | "final"
      user_role: "super_admin" | "admin" | "auditor"
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
    Enums: {
      account_status: ["active", "suspended"],
      assessment_period: ["pre", "mid", "final"],
      user_role: ["super_admin", "admin", "auditor"],
    },
  },
} as const

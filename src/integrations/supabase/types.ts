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
      activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          summary?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          layer: string
          link_url: string | null
          publish_at: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          layer?: string
          link_url?: string | null
          publish_at?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          layer?: string
          link_url?: string | null
          publish_at?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string
          description: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          name: string
          phase_id: string
          province_id: string | null
          region_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id: string
          name: string
          phase_id: string
          province_id?: string | null
          region_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          name?: string
          phase_id?: string
          province_id?: string | null
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          actor_email: string | null
          bytes: number
          created_at: string
          detail: string | null
          files_count: number
          id: string
          kind: string
          location_url: string | null
          status: string
          tables_count: number
          target: string
        }
        Insert: {
          actor_email?: string | null
          bytes?: number
          created_at?: string
          detail?: string | null
          files_count?: number
          id?: string
          kind: string
          location_url?: string | null
          status: string
          tables_count?: number
          target: string
        }
        Update: {
          actor_email?: string | null
          bytes?: number
          created_at?: string
          detail?: string | null
          files_count?: number
          id?: string
          kind?: string
          location_url?: string | null
          status?: string
          tables_count?: number
          target?: string
        }
        Relationships: []
      }
      backup_settings: {
        Row: {
          created_at: string
          frequency: string
          github_branch: string | null
          github_folder: string | null
          github_owner: string | null
          github_repo: string | null
          id: string
          include_auth_users: boolean
          include_storage: boolean
          last_run_at: string | null
          last_status: string | null
          singleton: boolean
          target: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          frequency?: string
          github_branch?: string | null
          github_folder?: string | null
          github_owner?: string | null
          github_repo?: string | null
          id?: string
          include_auth_users?: boolean
          include_storage?: boolean
          last_run_at?: string | null
          last_status?: string | null
          singleton?: boolean
          target?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          frequency?: string
          github_branch?: string | null
          github_folder?: string | null
          github_owner?: string | null
          github_repo?: string | null
          id?: string
          include_auth_users?: boolean
          include_storage?: boolean
          last_run_at?: string | null
          last_status?: string | null
          singleton?: boolean
          target?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          snapshot: Json
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          snapshot: Json
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          snapshot?: Json
        }
        Relationships: []
      }
      coordinator_assignments: {
        Row: {
          area_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_assignments_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      ministry_updates: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          missionary_id: string
          report_date: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          missionary_id: string
          report_date?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          missionary_id?: string
          report_date?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      missionary_area_map: {
        Row: {
          area_id: string
          created_at: string
          full_name: string | null
          missionary_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          full_name?: string | null
          missionary_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          full_name?: string | null
          missionary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missionary_area_map_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      missionary_extras: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          idempotency_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          id: string
          idempotency_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          idempotency_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      missionary_photos: {
        Row: {
          cover_url: string | null
          missionary_id: string
          photo_url: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cover_url?: string | null
          missionary_id: string
          photo_url: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cover_url?: string | null
          missionary_id?: string
          photo_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          full_name: string
          id: string
          link_url: string | null
          logo_url: string | null
          short_name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          full_name: string
          id?: string
          link_url?: string | null
          logo_url?: string | null
          short_name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          full_name?: string
          id?: string
          link_url?: string | null
          logo_url?: string | null
          short_name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      phases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name: string
          order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order?: number
        }
        Relationships: []
      }
      prayer_events: {
        Row: {
          coordinator_approved_public: boolean
          created_at: string
          id: string
          missionary_id: string
          user_id: string | null
        }
        Insert: {
          coordinator_approved_public?: boolean
          created_at?: string
          id?: string
          missionary_id: string
          user_id?: string | null
        }
        Update: {
          coordinator_approved_public?: boolean
          created_at?: string
          id?: string
          missionary_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prayer_requests_db: {
        Row: {
          answered: boolean
          approved_at: string | null
          approved_by: string | null
          coordinator_approved_public: boolean
          created_at: string
          created_by: string | null
          detail: string | null
          id: string
          missionary_id: string
          title: string
          urgent: boolean
          visible: boolean
        }
        Insert: {
          answered?: boolean
          approved_at?: string | null
          approved_by?: string | null
          coordinator_approved_public?: boolean
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          missionary_id: string
          title: string
          urgent?: boolean
          visible?: boolean
        }
        Update: {
          answered?: boolean
          approved_at?: string | null
          approved_by?: string | null
          coordinator_approved_public?: boolean
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          missionary_id?: string
          title?: string
          urgent?: boolean
          visible?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          theme_prefs: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          theme_prefs?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          theme_prefs?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      provinces: {
        Row: {
          created_at: string
          id: string
          name: string
          region_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          region_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provinces_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      scriptures: {
        Row: {
          active: boolean
          created_at: string
          id: string
          reference: string
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          reference: string
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          reference?: string
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_receipts: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          image_url: string | null
          missionary_id: string
          note: string | null
          receipt_date: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          image_url?: string | null
          missionary_id: string
          note?: string | null
          receipt_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          image_url?: string | null
          missionary_id?: string
          note?: string | null
          receipt_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          chat_id: number
          created_at: string
          first_name: string | null
          is_admin: boolean
          last_seen_at: string
          username: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          first_name?: string | null
          is_admin?: boolean
          last_seen_at?: string
          username?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          first_name?: string | null
          is_admin?: boolean
          last_seen_at?: string
          username?: string | null
        }
        Relationships: []
      }
      thank_you_letters: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          letter_date: string
          letter_url: string | null
          message: string | null
          missionary_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          letter_date?: string
          letter_url?: string | null
          message?: string | null
          missionary_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          letter_date?: string
          letter_url?: string | null
          message?: string | null
          missionary_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      prayer_counts: {
        Row: {
          missionary_id: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "coordinator" | "supporter"
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
      app_role: ["admin", "coordinator", "supporter"],
    },
  },
} as const

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
      authors: {
        Row: {
          bio: string
          created_at: string
          credentials: string[] | null
          id: string
          is_expert_verified: boolean
          is_licensed_professional: boolean
          job_title: string
          linkedin_url: string
          name: string
          photo_url: string
          rating: number | null
          years_experience: number
        }
        Insert: {
          bio: string
          created_at?: string
          credentials?: string[] | null
          id?: string
          is_expert_verified?: boolean
          is_licensed_professional?: boolean
          job_title: string
          linkedin_url: string
          name: string
          photo_url: string
          rating?: number | null
          years_experience: number
        }
        Update: {
          bio?: string
          created_at?: string
          credentials?: string[] | null
          id?: string
          is_expert_verified?: boolean
          is_licensed_professional?: boolean
          job_title?: string
          linkedin_url?: string
          name?: string
          photo_url?: string
          rating?: number | null
          years_experience?: number
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category: string
          citation_health_score: number | null
          cluster_id: string | null
          cluster_number: number | null
          cluster_theme: string | null
          created_at: string
          cta_article_ids: string[] | null
          date_modified: string | null
          date_published: string | null
          detailed_content: string
          diagram_description: string | null
          diagram_url: string | null
          external_citations: Json | null
          faq_entities: Json | null
          featured_image_alt: string
          featured_image_caption: string | null
          featured_image_url: string
          funnel_stage: string
          has_dead_citations: boolean | null
          headline: string
          id: string
          internal_links: Json | null
          language: string
          last_citation_check_at: string | null
          last_edited_by: string | null
          meta_description: string
          meta_title: string
          published_by: string | null
          read_time: number | null
          related_article_ids: string[] | null
          reviewer_id: string | null
          slug: string
          speakable_answer: string
          status: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category: string
          citation_health_score?: number | null
          cluster_id?: string | null
          cluster_number?: number | null
          cluster_theme?: string | null
          created_at?: string
          cta_article_ids?: string[] | null
          date_modified?: string | null
          date_published?: string | null
          detailed_content: string
          diagram_description?: string | null
          diagram_url?: string | null
          external_citations?: Json | null
          faq_entities?: Json | null
          featured_image_alt: string
          featured_image_caption?: string | null
          featured_image_url: string
          funnel_stage: string
          has_dead_citations?: boolean | null
          headline: string
          id?: string
          internal_links?: Json | null
          language: string
          last_citation_check_at?: string | null
          last_edited_by?: string | null
          meta_description: string
          meta_title: string
          published_by?: string | null
          read_time?: number | null
          related_article_ids?: string[] | null
          reviewer_id?: string | null
          slug: string
          speakable_answer: string
          status?: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category?: string
          citation_health_score?: number | null
          cluster_id?: string | null
          cluster_number?: number | null
          cluster_theme?: string | null
          created_at?: string
          cta_article_ids?: string[] | null
          date_modified?: string | null
          date_published?: string | null
          detailed_content?: string
          diagram_description?: string | null
          diagram_url?: string | null
          external_citations?: Json | null
          faq_entities?: Json | null
          featured_image_alt?: string
          featured_image_caption?: string | null
          featured_image_url?: string
          funnel_stage?: string
          has_dead_citations?: boolean | null
          headline?: string
          id?: string
          internal_links?: Json | null
          language?: string
          last_citation_check_at?: string | null
          last_edited_by?: string | null
          meta_description?: string
          meta_title?: string
          published_by?: string | null
          read_time?: number | null
          related_article_ids?: string[] | null
          reviewer_id?: string | null
          slug?: string
          speakable_answer?: string
          status?: string
          translations?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chatbot_conversations: {
        Row: {
          area: string | null
          article_slug: string | null
          budget_range: string | null
          conversation_transcript: Json | null
          created_at: string
          id: string
          preferred_language: string | null
          property_type: string | null
          user_email: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          area?: string | null
          article_slug?: string | null
          budget_range?: string | null
          conversation_transcript?: Json | null
          created_at?: string
          id?: string
          preferred_language?: string | null
          property_type?: string | null
          user_email?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          area?: string | null
          article_slug?: string | null
          budget_range?: string | null
          conversation_transcript?: Json | null
          created_at?: string
          id?: string
          preferred_language?: string | null
          property_type?: string | null
          user_email?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      citation_usage_tracking: {
        Row: {
          anchor_text: string | null
          article_id: string | null
          citation_source: string | null
          citation_url: string
          created_at: string | null
          first_added_at: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          position_in_article: number | null
          updated_at: string | null
        }
        Insert: {
          anchor_text?: string | null
          article_id?: string | null
          citation_source?: string | null
          citation_url: string
          created_at?: string | null
          first_added_at?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          position_in_article?: number | null
          updated_at?: string | null
        }
        Update: {
          anchor_text?: string | null
          article_id?: string | null
          citation_source?: string | null
          citation_url?: string
          created_at?: string | null
          first_added_at?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          position_in_article?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citation_usage_tracking_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_generations: {
        Row: {
          articles: Json | null
          articles_per_cluster: number | null
          cluster_count: number | null
          cluster_focus_areas: Json | null
          created_at: string | null
          error: string | null
          id: string
          language: string
          primary_keyword: string
          progress: Json | null
          started_at: string | null
          status: string
          target_audience: string
          timeout_at: string | null
          topic: string
          total_articles: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          articles?: Json | null
          articles_per_cluster?: number | null
          cluster_count?: number | null
          cluster_focus_areas?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          language: string
          primary_keyword: string
          progress?: Json | null
          started_at?: string | null
          status?: string
          target_audience: string
          timeout_at?: string | null
          topic: string
          total_articles?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          articles?: Json | null
          articles_per_cluster?: number | null
          cluster_count?: number | null
          cluster_focus_areas?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          language?: string
          primary_keyword?: string
          progress?: Json | null
          started_at?: string | null
          status?: string
          target_audience?: string
          timeout_at?: string | null
          topic?: string
          total_articles?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      dead_link_replacements: {
        Row: {
          applied_to_articles: string[] | null
          confidence_score: number | null
          created_at: string | null
          id: string
          original_source: string | null
          original_url: string
          replacement_reason: string | null
          replacement_source: string | null
          replacement_url: string
          status: string | null
          suggested_by: string | null
          updated_at: string | null
        }
        Insert: {
          applied_to_articles?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          original_source?: string | null
          original_url: string
          replacement_reason?: string | null
          replacement_source?: string | null
          replacement_url: string
          status?: string | null
          suggested_by?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_to_articles?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          original_source?: string | null
          original_url?: string
          replacement_reason?: string | null
          replacement_source?: string | null
          replacement_url?: string
          status?: string | null
          suggested_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      external_citation_health: {
        Row: {
          content_hash: string | null
          created_at: string | null
          first_seen_at: string | null
          http_status_code: number | null
          id: string
          is_government_source: boolean | null
          language: string | null
          last_checked_at: string | null
          page_title: string | null
          redirect_url: string | null
          response_time_ms: number | null
          source_name: string | null
          status: string | null
          times_failed: number | null
          times_verified: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          first_seen_at?: string | null
          http_status_code?: number | null
          id?: string
          is_government_source?: boolean | null
          language?: string | null
          last_checked_at?: string | null
          page_title?: string | null
          redirect_url?: string | null
          response_time_ms?: number | null
          source_name?: string | null
          status?: string | null
          times_failed?: number | null
          times_verified?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          first_seen_at?: string | null
          http_status_code?: number | null
          id?: string
          is_government_source?: boolean | null
          language?: string | null
          last_checked_at?: string | null
          page_title?: string | null
          redirect_url?: string | null
          response_time_ms?: number | null
          source_name?: string | null
          status?: string | null
          times_failed?: number | null
          times_verified?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      user_role_changes: {
        Row: {
          action: string
          created_at: string | null
          id: string
          notes: string | null
          performed_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          target_user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_extension_exists: {
        Args: { extension_name: string }
        Returns: boolean
      }
      check_stuck_cluster_jobs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_database_triggers: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_statement: string
          event_object_table: string
          trigger_name: string
        }[]
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const

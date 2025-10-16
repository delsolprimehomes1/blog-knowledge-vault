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
          job_title: string
          linkedin_url: string
          name: string
          photo_url: string
          years_experience: number
        }
        Insert: {
          bio: string
          created_at?: string
          credentials?: string[] | null
          id?: string
          job_title: string
          linkedin_url: string
          name: string
          photo_url: string
          years_experience: number
        }
        Update: {
          bio?: string
          created_at?: string
          credentials?: string[] | null
          id?: string
          job_title?: string
          linkedin_url?: string
          name?: string
          photo_url?: string
          years_experience?: number
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category: string
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
          headline: string
          id: string
          internal_links: Json | null
          language: string
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
          headline: string
          id?: string
          internal_links?: Json | null
          language: string
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
          headline?: string
          id?: string
          internal_links?: Json | null
          language?: string
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
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

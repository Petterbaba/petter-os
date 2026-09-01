// GENERERT FIL – ikke rediger for hånd.
// Regenereres etter hver migrasjon med Supabase MCP `generate_typescript_types`
// (eller `supabase gen types typescript` når CLI tas i bruk).
// Importeres KUN av datalaget (src/lib/data/ og src/lib/supabase/) – aldri av komponenter.

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
      dinner_ingredients: {
        Row: {
          amount_grams: number | null
          created_at: string
          dinner_id: string
          food_item_id: string | null
          id: string
          label: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_grams?: number | null
          created_at?: string
          dinner_id: string
          food_item_id?: string | null
          id?: string
          label: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_grams?: number | null
          created_at?: string
          dinner_id?: string
          food_item_id?: string | null
          id?: string
          label?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dinner_ingredients_dinner_id_fkey"
            columns: ["dinner_id"]
            isOneToOne: false
            referencedRelation: "dinners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dinner_ingredients_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      dinner_plans: {
        Row: {
          created_at: string
          dinner_id: string
          id: string
          planned_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dinner_id: string
          id?: string
          planned_on: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          dinner_id?: string
          id?: string
          planned_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dinner_plans_dinner_id_fkey"
            columns: ["dinner_id"]
            isOneToOne: false
            referencedRelation: "dinners"
            referencedColumns: ["id"]
          },
        ]
      }
      dinners: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          instructions: string | null
          notes: string | null
          oda_recipe_id: string | null
          servings: number
          source_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          notes?: string | null
          oda_recipe_id?: string | null
          servings: number
          source_url?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          notes?: string | null
          oda_recipe_id?: string | null
          servings?: number
          source_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_items: {
        Row: {
          archived_at: string | null
          carbs_per_100g: number | null
          created_at: string
          fat_per_100g: number | null
          fiber_per_100g: number | null
          id: string
          kcal_per_100g: number
          name: string
          portions: Json
          protein_per_100g: number | null
          source_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          carbs_per_100g?: number | null
          created_at?: string
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          id?: string
          kcal_per_100g: number
          name: string
          portions?: Json
          protein_per_100g?: number | null
          source_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          carbs_per_100g?: number | null
          created_at?: string
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          id?: string
          kcal_per_100g?: number
          name?: string
          portions?: Json
          protein_per_100g?: number | null
          source_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_entries: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          logged_on: string
          note: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          logged_on: string
          note?: string | null
          updated_at?: string
          user_id?: string
          value: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          logged_on?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_entries_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          count_source: string | null
          created_at: string
          due_on: string | null
          id: string
          kind: string
          metric_key: string | null
          misogi_year: number | null
          motivation: string | null
          outcome: string | null
          reflection: string | null
          starts_on: string | null
          target_direction: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          count_source?: string | null
          created_at?: string
          due_on?: string | null
          id?: string
          kind: string
          metric_key?: string | null
          misogi_year?: number | null
          motivation?: string | null
          outcome?: string | null
          reflection?: string | null
          starts_on?: string | null
          target_direction?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          count_source?: string | null
          created_at?: string
          due_on?: string | null
          id?: string
          kind?: string
          metric_key?: string | null
          misogi_year?: number | null
          motivation?: string | null
          outcome?: string | null
          reflection?: string | null
          starts_on?: string | null
          target_direction?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_metric_key_fkey"
            columns: ["metric_key"]
            isOneToOne: false
            referencedRelation: "metric_types"
            referencedColumns: ["key"]
          },
        ]
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          written_on: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id?: string
          written_on: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          written_on?: string
        }
        Relationships: []
      }
      metric_entries: {
        Row: {
          created_at: string
          id: string
          measured_on: string
          metric_key: string
          note: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_on: string
          metric_key: string
          note?: string | null
          updated_at?: string
          user_id?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_on?: string
          metric_key?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_entries_metric_key_fkey"
            columns: ["metric_key"]
            isOneToOne: false
            referencedRelation: "metric_types"
            referencedColumns: ["key"]
          },
        ]
      }
      metric_types: {
        Row: {
          created_at: string
          key: string
          label: string
          unit: string
        }
        Insert: {
          created_at?: string
          key: string
          label: string
          unit: string
        }
        Update: {
          created_at?: string
          key?: string
          label?: string
          unit?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          category: string | null
          city: string | null
          companions: string | null
          cost_nok: number | null
          country_code: string
          created_at: string
          ended_on: string
          id: string
          notes: string | null
          rating: number | null
          started_on: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          companions?: string | null
          cost_nok?: number | null
          country_code: string
          created_at?: string
          ended_on: string
          id?: string
          notes?: string | null
          rating?: number | null
          started_on: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          city?: string | null
          companions?: string | null
          cost_nok?: number | null
          country_code?: string
          created_at?: string
          ended_on?: string
          id?: string
          notes?: string | null
          rating?: number | null
          started_on?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

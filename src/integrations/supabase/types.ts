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
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          brand_color: string
          client_company: string | null
          client_email: string
          client_name: string
          created_at: string
          description: string
          discount: number
          display_options: Json
          document_status: string
          document_type: string
          due_date: string
          id: string
          invoice_currency: string
          issue_date: string
          network: string
          number: string
          payment_methods: Json
          payment_status: string
          po_number: string | null
          project_code: string | null
          reference_number: string | null
          seller_address: string | null
          seller_business: string | null
          seller_email: string
          seller_logo_url: string | null
          seller_name: string
          status: string
          subtotal: number
          tax: number
          terms_and_conditions: string
          title: string
          total: number
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          document_type?: string
          document_status?: string
          payment_status?: string
          brand_color?: string
          client_company?: string | null
          client_email: string
          client_name: string
          created_at?: string
          description?: string
          discount?: number
          display_options?: Json
          due_date: string
          id?: string
          invoice_currency?: string
          issue_date?: string
          network: string
          number: string
          payment_methods?: Json
          po_number?: string | null
          project_code?: string | null
          reference_number?: string | null
          seller_address?: string | null
          seller_business?: string | null
          seller_email: string
          seller_logo_url?: string | null
          seller_name: string
          status?: string
          subtotal?: number
          tax?: number
          terms_and_conditions?: string
          title: string
          total?: number
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          document_type?: string
          document_status?: string
          payment_status?: string
          brand_color?: string
          client_company?: string | null
          client_email?: string
          client_name?: string
          created_at?: string
          description?: string
          discount?: number
          display_options?: Json
          due_date?: string
          id?: string
          invoice_currency?: string
          issue_date?: string
          network?: string
          number?: string
          payment_methods?: Json
          po_number?: string | null
          project_code?: string | null
          reference_number?: string | null
          seller_address?: string | null
          seller_business?: string | null
          seller_email?: string
          seller_logo_url?: string | null
          seller_name?: string
          status?: string
          subtotal?: number
          tax?: number
          terms_and_conditions?: string
          title?: string
          total?: number
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          brand_color: string
          business: string | null
          company_address: string | null
          contact_email: string | null
          created_at: string
          email: string | null
          email_notifications: boolean
          id: string
          invoice_updates: boolean
          is_disabled: boolean
          logo_url: string | null
          name: string
          network: string
          plan: "free" | "pro" | "business"
          role: "user" | "admin"
          updated_at: string
          wallet: string
          website: string | null
        }
        Insert: {
          document_type?: string
          document_status?: string
          payment_status?: string
          brand_color?: string
          business?: string | null
          company_address?: string | null
          contact_email?: string | null
          created_at?: string
          email?: string | null
          email_notifications?: boolean
          id: string
          invoice_updates?: boolean
          is_disabled?: boolean
          logo_url?: string | null
          name?: string
          network?: string
          plan?: "free" | "pro" | "business"
          role?: "user" | "admin"
          updated_at?: string
          wallet?: string
          website?: string | null
        }
        Update: {
          document_type?: string
          document_status?: string
          payment_status?: string
          brand_color?: string
          business?: string | null
          company_address?: string | null
          contact_email?: string | null
          created_at?: string
          email?: string | null
          email_notifications?: boolean
          id?: string
          invoice_updates?: boolean
          is_disabled?: boolean
          logo_url?: string | null
          name?: string
          network?: string
          plan?: "free" | "pro" | "business"
          role?: "user" | "admin"
          updated_at?: string
          wallet?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invoice_plan_usage: {
        Args: Record<string, never>
        Returns: {
          plan: Database["public"]["Enums"]["user_plan"]
          invoices_this_month: number
          monthly_limit: number | null
        }[]
      }
      allocate_invoice_document_number: {
        Args: { p_document_type: string }
        Returns: string
      }
    }
    Enums: {
      user_plan: "free" | "pro" | "business"
      user_role: "user" | "admin"
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

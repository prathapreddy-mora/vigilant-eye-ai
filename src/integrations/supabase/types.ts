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
      alert_audit_log: {
        Row: {
          action: string
          alert_id: string
          created_at: string
          id: string
          note: string | null
          officer_id: string | null
        }
        Insert: {
          action: string
          alert_id: string
          created_at?: string
          id?: string
          note?: string | null
          officer_id?: string | null
        }
        Update: {
          action?: string
          alert_id?: string
          created_at?: string
          id?: string
          note?: string | null
          officer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_audit_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          plate: string
          reasons: Database["public"]["Enums"]["alert_reason"][]
          risk: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          scan_id: string | null
          state: Database["public"]["Enums"]["alert_state"]
          summary: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          plate: string
          reasons?: Database["public"]["Enums"]["alert_reason"][]
          risk?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          scan_id?: string | null
          state?: Database["public"]["Enums"]["alert_state"]
          summary?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          plate?: string
          reasons?: Database["public"]["Enums"]["alert_reason"][]
          risk?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          scan_id?: string | null
          state?: Database["public"]["Enums"]["alert_state"]
          summary?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          city: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          badge_number: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          station: string | null
          updated_at: string
        }
        Insert: {
          badge_number?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          station?: string | null
          updated_at?: string
        }
        Update: {
          badge_number?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          station?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          checkpoint_id: string | null
          checkpoint_name: string | null
          created_at: string
          detected_brand: string | null
          detected_color: string | null
          detected_type: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          matched: boolean
          ocr_confidence: number | null
          officer_id: string | null
          plate: string
          vehicle_id: string | null
          verification_status: string
        }
        Insert: {
          checkpoint_id?: string | null
          checkpoint_name?: string | null
          created_at?: string
          detected_brand?: string | null
          detected_color?: string | null
          detected_type?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          matched?: boolean
          ocr_confidence?: number | null
          officer_id?: string | null
          plate: string
          vehicle_id?: string | null
          verification_status?: string
        }
        Update: {
          checkpoint_id?: string | null
          checkpoint_name?: string | null
          created_at?: string
          detected_brand?: string | null
          detected_color?: string | null
          detected_type?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          matched?: boolean
          ocr_confidence?: number | null
          officer_id?: string | null
          plate?: string
          vehicle_id?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string
          challan_amount: number
          color: string
          created_at: string
          criminal_cases: string[]
          id: string
          insurance_expiry: string | null
          insurance_valid: boolean
          last_known_lat: number | null
          last_known_lng: number | null
          last_seen_at: string | null
          model: string
          owner_address: string | null
          owner_contact: string | null
          owner_name: string
          pending_challans: number
          photo_url: string | null
          plate: string
          puc_expiry: string | null
          puc_valid: boolean
          rc_number: string | null
          registration_date: string | null
          registration_validity: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          brand: string
          challan_amount?: number
          color: string
          created_at?: string
          criminal_cases?: string[]
          id?: string
          insurance_expiry?: string | null
          insurance_valid?: boolean
          last_known_lat?: number | null
          last_known_lng?: number | null
          last_seen_at?: string | null
          model: string
          owner_address?: string | null
          owner_contact?: string | null
          owner_name: string
          pending_challans?: number
          photo_url?: string | null
          plate: string
          puc_expiry?: string | null
          puc_valid?: boolean
          rc_number?: string | null
          registration_date?: string | null
          registration_validity?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          brand?: string
          challan_amount?: number
          color?: string
          created_at?: string
          criminal_cases?: string[]
          id?: string
          insurance_expiry?: string | null
          insurance_valid?: boolean
          last_known_lat?: number | null
          last_known_lng?: number | null
          last_seen_at?: string | null
          model?: string
          owner_address?: string | null
          owner_contact?: string | null
          owner_name?: string
          pending_challans?: number
          photo_url?: string | null
          plate?: string
          puc_expiry?: string | null
          puc_valid?: boolean
          rc_number?: string | null
          registration_date?: string | null
          registration_validity?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type?: string
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
    }
    Enums: {
      alert_reason:
        | "stolen"
        | "blacklisted"
        | "criminal_case"
        | "pending_challan"
        | "attribute_mismatch"
        | "cloned_plate"
        | "under_investigation"
        | "low_confidence"
      alert_state: "active" | "assigned" | "resolved" | "closed"
      app_role: "constable" | "sho" | "admin"
      risk_level: "low" | "medium" | "high" | "critical"
      vehicle_status:
        | "active"
        | "stolen"
        | "blacklisted"
        | "under_investigation"
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
      alert_reason: [
        "stolen",
        "blacklisted",
        "criminal_case",
        "pending_challan",
        "attribute_mismatch",
        "cloned_plate",
        "under_investigation",
        "low_confidence",
      ],
      alert_state: ["active", "assigned", "resolved", "closed"],
      app_role: ["constable", "sho", "admin"],
      risk_level: ["low", "medium", "high", "critical"],
      vehicle_status: [
        "active",
        "stolen",
        "blacklisted",
        "under_investigation",
      ],
    },
  },
} as const

export type Grade = "F" | "E" | "D" | "C" | "B" | "A" | "S" | "SS" | "SSS" | "Ex";

export type GrowthStage = "seed" | "sprout" | "growing" | "mature" | "ex";
export type GrowthMode = "off" | "stage1" | "stage2"; // off, 2배속, 즉시성장

export type CreatureType = "plant" | "animal" | "spirit" | "other";

export interface Database {
  public: {
    Tables: {
      zones: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          ecosystem_type: string;
          climate: string | null;
          auto_feed: boolean;
          auto_environment: boolean;
          creature_count: number;
          plant_count: number;
          color: string;
          icon: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["zones"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["zones"]["Insert"]>;
      };
      creatures: {
        Row: {
          id: string;
          name: string;
          type: CreatureType;
          grade: Grade;
          zone_id: string | null;
          growth_stage: GrowthStage;
          growth_mode: GrowthMode;
          description: string | null;
          image_url: string | null;
          auto_classified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["creatures"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["creatures"]["Insert"]>;
      };
      byproducts: {
        Row: {
          id: string;
          name: string;
          source_creature_id: string | null;
          source_zone_id: string | null;
          grade: Grade;
          quantity: number;
          category: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["byproducts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["byproducts"]["Insert"]>;
      };
      access_keys: {
        Row: {
          id: string;
          holder_name: string;
          role: "owner" | "partner" | "pet" | "guest";
          is_active: boolean;
          granted_at: string;
          expires_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["access_keys"]["Row"], "id" | "granted_at">;
        Update: Partial<Database["public"]["Tables"]["access_keys"]["Insert"]>;
      };
      garden_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["garden_settings"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["garden_settings"]["Insert"]>;
      };
    };
  };
}

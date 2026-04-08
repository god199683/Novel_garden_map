import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ltdumscqmsienyrewpzp.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0ZHVtc2NxbXNpZW55cmV3cHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTU0NzgsImV4cCI6MjA5MTAzMTQ3OH0.COolIZ6V9KX_zhQ-S6melgzsxvyKNJdC8zOVz09By7s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nseofqhsninmfzqnvkvl.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZW9mcWhzbmlubWZ6cW52a3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTUyMzEsImV4cCI6MjA5OTE3MTIzMX0.-hN-BUyUu9hMMXFJ2vXPagfVXlZgd4AEDlcNBYq1h6Y";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { required } from "@/lib/env";

// Service-role client: bypasses RLS. Import ONLY from server code (route handlers / server components).
export function supabaseAdmin() {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

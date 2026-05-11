import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Supabase renamed the "anon" key to "publishable key" in newer projects.
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Browser-safe client — uses the publishable (anon) key. */
export const supabase = createClient<Database>(supabaseUrl, publishableKey);

/**
 * Server-side admin client — uses the secret key, bypasses RLS.
 * Only call this from Route Handlers or Server Actions, never in client components.
 *
 * Typed as `any` at the DB layer: column names come from SQL migrations which
 * are the single source of truth. The typed `Database` interface in types.ts
 * is still available for documentation and manual use.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Column-level types are guaranteed by the SQL migrations; no Database generic needed here.
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
}

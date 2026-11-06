import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // lib/supabase/client.ts builds a client on import, which throws without
    // a URL. Placeholders let modules that import it load; no test should
    // reach a real database.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

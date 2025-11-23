export const Config = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1",
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENV || "development",
} as const;



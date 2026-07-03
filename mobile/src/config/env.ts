function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  // Note: do NOT expose OpenRouter API keys to the mobile bundle.
  // Requests to OpenRouter should be routed through a backend/proxy (Supabase Edge Function).
};

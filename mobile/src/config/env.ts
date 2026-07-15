function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  // We are exposing this directly to bypass the broken Supabase Edge Function
  openRouterApiKey: requireEnv('EXPO_PUBLIC_OPENROUTER_API_KEY', process.env.EXPO_PUBLIC_OPENROUTER_API_KEY),
};

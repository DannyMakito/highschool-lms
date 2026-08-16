function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  // AI is optional. The portal continues to work when the tutor backend is
  // not configured; privileged AI credentials must never be required by the
  // mobile client.
  openRouterApiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || null,
};

import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

const queryClient = new QueryClient();

function AuthNavigation() {
  const { loading, session, parent } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuthFlow = segments[0] === "(auth)";
    const authenticated = Boolean(session && parent);
    if (!authenticated && !inAuthFlow) router.replace("/sign-in");
    if (authenticated && inAuthFlow) router.replace("/home");
  }, [loading, parent, router, segments, session]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthNavigation />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

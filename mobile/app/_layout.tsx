import { useEffect, useState } from "react";
import { Slot, useRouter, usePathname } from "expo-router";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { View, ActivityIndicator } from "react-native";

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

function RootLayoutNav() {
    const { isAuthenticated, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isNavigationReady, setIsNavigationReady] = useState(false);

    useEffect(() => {
        setIsNavigationReady(true);
    }, []);

    useEffect(() => {
        if (!isNavigationReady || loading) return;

        const inAuthGroup = pathname.startsWith("/(tabs)");
        const inSubjectsRoute = pathname.startsWith("/subjects");
        const inMoreRoute = ["/quiz", "/register", "/notifications", "/discussions", "/announcements", "/settings", "/grades"].some((p) => pathname === p || pathname.startsWith(p + "/"));

        if (!isAuthenticated && (inAuthGroup || inMoreRoute)) {
            router.replace("/login");
        } else if (isAuthenticated && !inAuthGroup && !inSubjectsRoute && !inMoreRoute) {
            router.replace("/(tabs)");
        }
    }, [isAuthenticated, loading, pathname, isNavigationReady]);

    if (loading || !isNavigationReady) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
                <ActivityIndicator size="large" color="#06b6d4" />
            </View>
        );
    }

    return (
        <GluestackUIProvider mode="dark">
            <Slot />
        </GluestackUIProvider>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
    );
}

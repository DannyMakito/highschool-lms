import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { View, ActivityIndicator } from "react-native";

function RootLayoutNav() {
    const { isAuthenticated, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [isNavigationReady, setIsNavigationReady] = useState(false);

    useEffect(() => {
        setIsNavigationReady(true);
    }, []);

    useEffect(() => {
        if (!isNavigationReady || loading) return;

        const inAuthGroup = segments[0] === "(tabs)";

        if (!isAuthenticated && inAuthGroup) {
            router.replace("/login");
        } else if (isAuthenticated && !inAuthGroup) {
            router.replace("/(tabs)");
        }
    }, [isAuthenticated, loading, segments, isNavigationReady]);

    if (loading || !isNavigationReady) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" }}>
                <ActivityIndicator size="large" color="#06b6d4" />
            </View>
        );
    }

    return <Slot />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
    );
}

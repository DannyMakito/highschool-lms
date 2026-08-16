import { useEffect, useState, useRef } from "react";
import { Slot, useRouter, usePathname } from "expo-router";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '../src/lib/queryClient';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import { registerForPushNotifications, addNotificationTapHandler, initNotifications } from '../src/lib/notifications';

function RootLayoutNav() {
    const { isAuthenticated, loading, user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isNavigationReady, setIsNavigationReady] = useState(false);
    const notificationTapCleanup = useRef<(() => void) | null>(null);

    useEffect(() => {
        setIsNavigationReady(true);
    }, []);

    useEffect(() => {
        if (!isNavigationReady || loading) return;

        const inParentPortal = pathname === "/parent" || pathname.startsWith("/parent/");
        const isPublicEntry = pathname === "/" || pathname === "/login" || pathname === "/parent-login";
        const inStudentPortal = ["/(tabs)", "/subjects", "/assignments", "/tutor"].some((route) => pathname === route || pathname.startsWith(route + "/"));
        const inSubjectsRoute = pathname.startsWith("/subjects");
        const inMoreRoute = ["/quiz", "/register", "/notifications", "/discussions", "/announcements", "/settings", "/grades"].some((p) => pathname === p || pathname.startsWith(p + "/"));

        if (!isAuthenticated && !isPublicEntry) {
            router.replace("/");
        } else if (isAuthenticated && user?.role === "parent" && !inParentPortal) {
            router.replace("/parent");
        } else if (isAuthenticated && user?.role !== "parent" && inParentPortal) {
            router.replace("/(tabs)");
        } else if (isAuthenticated && user?.role !== "parent" && (!inStudentPortal && !inSubjectsRoute && !inMoreRoute)) {
            router.replace("/(tabs)");
        }
    }, [isAuthenticated, loading, pathname, isNavigationReady, router]);

    useEffect(() => {
        if (!isNavigationReady || loading) return;

        if (user?.id) {
            initNotifications();
            notificationTapCleanup.current = addNotificationTapHandler(router);
            registerForPushNotifications(user.id);
        } else {
            if (notificationTapCleanup.current) {
                notificationTapCleanup.current();
                notificationTapCleanup.current = null;
            }
        }

        return () => {
            if (notificationTapCleanup.current) {
                notificationTapCleanup.current();
                notificationTapCleanup.current = null;
            }
        };
    }, [user?.id, loading, isNavigationReady, router]);

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
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
        >
            <AuthProvider>
                <RootLayoutNav />
            </AuthProvider>
        </PersistQueryClientProvider>
    );
}

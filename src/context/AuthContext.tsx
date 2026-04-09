/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import supabase from "@/lib/supabase";

export type UserRole = "learner" | "teacher" | "principal" | null;

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

interface AuthContextType {
    user: User | null;
    role: UserRole;
    login: (email: string, pin: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Read cached user from localStorage.
 * This is used ONLY so the sidebar/nav can render immediately on refresh.
 * It is NOT a source of truth; the real check comes from supabase.auth.getSession().
 */
function getCachedUser(): User | null {
    try {
        const raw = localStorage.getItem("hlms_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    // Pre-load from cache so sidebar renders instantly on refresh
    const [user, setUser] = useState<User | null>(getCachedUser);
    const [loading, setLoading] = useState(true);

    // Track ongoing profile fetch to prevent concurrent requests
    const profileFetchInProgress = useRef<string | null>(null);

    const clearAuthState = () => {
        setUser(null);
        localStorage.removeItem("hlms_user");
    };

    const fetchProfile = async (uid: string, email: string): Promise<User | null> => {
        if (profileFetchInProgress.current === uid) {
            return user;
        }

        profileFetchInProgress.current = uid;

        try {
            const profilePromise = supabase
                .from("profiles")
                .select("*")
                .eq("id", uid)
                .single();

            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            let warningTimeoutId: ReturnType<typeof setTimeout> | null = null;

            const timeoutPromise = new Promise<never>((_, reject) => {
                warningTimeoutId = setTimeout(() => {
                    console.warn("[AuthContext] Profile fetch has been running for 3 seconds");
                }, 3000);

                timeoutId = setTimeout(() => {
                    reject(new Error("Profile fetch timeout after 5 seconds"));
                }, 5000);
            });

            const result = await Promise.race([profilePromise, timeoutPromise]);

            if (timeoutId) clearTimeout(timeoutId);
            if (warningTimeoutId) clearTimeout(warningTimeoutId);

            const { data: profile, error } = result;
            const cached = getCachedUser();

            if (error || !profile) {
                if (cached) {
                    setUser(cached);
                    return cached;
                }

                clearAuthState();
                setLoading(false);
                return null;
            }

            const userData: User = {
                id: uid,
                name: profile.full_name,
                email,
                role: profile.role === "student" ? "learner" : (profile.role as UserRole),
            };

            setUser(userData);
            localStorage.setItem("hlms_user", JSON.stringify(userData));
            return userData;
        } catch (err) {
            console.error("[AuthContext] Profile fetch failed:", err);

            const cached = getCachedUser();
            if (cached) {
                setUser(cached);
                return cached;
            }

            clearAuthState();
            setLoading(false);
            return null;
        } finally {
            profileFetchInProgress.current = null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: Session | null) => {
            if (!mounted) return;

            if (session?.user) {
                try {
                    await fetchProfile(session.user.id, session.user.email || "");
                } finally {
                    if (mounted) setLoading(false);
                }
            } else {
                clearAuthState();
                if (mounted) setLoading(false);
            }
        };

        const rehydrateSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (!mounted) return;

            if (error) {
                // Keep cached user if session check fails transiently.
                console.error("[AuthContext] Session rehydrate error:", error);
                setLoading(false);
                return;
            }

            await handleSession(session);
        };

        const initializeAuth = async () => {
            try {
                const cachedUser = getCachedUser();
                if (cachedUser) {
                    setUser(cachedUser);
                    setLoading(false);
                }

                const { data: { session }, error } = await supabase.auth.getSession();
                if (!mounted) return;

                if (error) {
                    console.error("[AuthContext] Error getting session:", error);
                    setLoading(false);
                    return;
                }

                if (session?.user) {
                    if (cachedUser && cachedUser.id === session.user.id) {
                        setLoading(false);
                        return;
                    }

                    await fetchProfile(session.user.id, session.user.email || "");
                    if (mounted) setLoading(false);
                } else {
                    clearAuthState();
                    if (mounted) setLoading(false);
                }
            } catch (err) {
                console.error("[AuthContext] Auth initialization error:", err);
                if (mounted) setLoading(false);
            }
        };

        void initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
                await handleSession(session);
                return;
            }

            if (event === "SIGNED_OUT") {
                clearAuthState();
                setLoading(false);
                return;
            }

            if (event === "TOKEN_REFRESHED") {
                setLoading(false);
                return;
            }

            setLoading(false);
        });

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void rehydrateSession();
            }
        };

        const onWindowFocus = () => {
            void rehydrateSession();
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("focus", onWindowFocus);

        return () => {
            mounted = false;
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("focus", onWindowFocus);
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, pin: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pin,
            });
            if (error) throw error;

            const signedInUser = data.session?.user;
            if (signedInUser) {
                await fetchProfile(signedInUser.id, signedInUser.email || "");
            }

            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Invalid credentials";
            return { success: false, message };
        }
    };

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Logout error:", error);
            }
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            clearAuthState();
        }
    };

    const value = {
        user,
        role: user ? (user.role as UserRole) : null,
        login,
        logout,
        isAuthenticated: !!user,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

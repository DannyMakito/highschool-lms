import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";


export type UserRole = "learner" | "teacher" | "principal" | null;

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    pin?: string;
    avatarUrl?: string;
    createdAt?: string;
}

interface AuthContextType {
    user: User | null;
    role: UserRole;
    login: (email: string, pin: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const profileFetchInProgress = useRef<string | null>(null);

    // Load cached user from AsyncStorage on mount
    useEffect(() => {
        AsyncStorage.getItem("hlms_user").then(cached => {
            if (cached) {
                try {
                    setUser(JSON.parse(cached));
                } catch {}
            }
        });
    }, []);

    const clearAuthState = async () => {
        setUser(null);
        await AsyncStorage.removeItem("hlms_user");
    };

    const fetchProfile = async (uid: string, email: string): Promise<User | null> => {
        if (profileFetchInProgress.current === uid) {
            return user;
        }
        profileFetchInProgress.current = uid;

        try {
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", uid)
                .single();

            if (error) {
                console.error("[AuthContext] Error fetching profile:", error);
                if (error.code === 'PGRST116') {
                    clearAuthState();
                }
                return null;
            }

            if (profile) {
                const updatedUser: User = {
                    id: uid,
                    email: email,
                    name: profile.full_name || profile.username || "User",
                    role: profile.role || "learner",
                    avatarUrl: profile.avatar_url,
                    pin: profile.pin,
                    createdAt: profile.created_at,
                };
                setUser(updatedUser);
                AsyncStorage.setItem("hlms_user", JSON.stringify(updatedUser));
                return updatedUser;
            }
            return null;
        } catch (error) {
            console.error("[AuthContext] Fetch exception:", error);
            return null;
        } finally {
            profileFetchInProgress.current = null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    await fetchProfile(session.user.id, session.user.email || '');
                } else {
                    await clearAuthState();
                }
            } catch (error) {
                console.error("[AuthContext] Init error:", error);
                await clearAuthState();
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AuthContext] Auth event: ${event}`);
            
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    await fetchProfile(session.user.id, session.user.email || '');
                }
            } else if (event === 'SIGNED_OUT') {
                await clearAuthState();
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, pin: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pin
            });
            if (error) throw error;
            if (data.user) {
                await fetchProfile(data.user.id, data.user.email || '');
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            await clearAuthState();
        } catch (error) {
            console.error("[AuthContext] Logout error:", error);
        }
    };

    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await fetchProfile(session.user.id, session.user.email || '');
        }
    };

    const value: AuthContextType = {
        user,
        role: user?.role || null,
        login,
        logout,
        isAuthenticated: !!user,
        loading,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

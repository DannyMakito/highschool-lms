
import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
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
 * It is NOT a source of truth – the real check comes from supabase.auth.getSession().
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

    const fetchProfile = async (uid: string, email: string): Promise<User | null> => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();

            if (error || !profile) {
                console.error("Profile fetch error:", error);
                return null;
            }

            const userData: User = {
                id: uid,
                name: profile.full_name,
                email: email,
                role: profile.role === 'student' ? 'learner' : profile.role as UserRole
            };
            setUser(userData);
            localStorage.setItem("hlms_user", JSON.stringify(userData));
            return userData;
        } catch (err) {
            console.error("Unexpected profile error:", err);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        // Ensure we never stay trapped in a loading state. 
        // A 4-second fail-safe is extremely generous for getting an initial auth state.
        const fallbackTimer = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 4000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!mounted) return;
                
                if (event === "INITIAL_SESSION") {
                    if (session?.user) {
                        setTimeout(async () => {
                            try {
                                await fetchProfile(session.user.id, session.user.email || "");
                            } finally {
                                if (mounted) setLoading(false);
                            }
                        }, 0);
                    } else {
                        setUser(null);
                        localStorage.removeItem("hlms_user");
                        if (mounted) setLoading(false);
                    }
                } else if (event === "SIGNED_IN") {
                    setTimeout(async () => {
                        try {
                            await fetchProfile(session!.user.id, session!.user.email || "");
                        } finally {
                            if (mounted) setLoading(false);
                        }
                    }, 0);
                } else if (event === "SIGNED_OUT") {
                    setUser(null);
                    localStorage.removeItem("hlms_user");
                }
            }
        );

        return () => {
            mounted = false;
            clearTimeout(fallbackTimer);
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, pin: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password: pin,
            });
            if (error) throw error;
            // onAuthStateChange will fire SIGNED_IN → fetchProfile → setUser
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message || "Invalid credentials" };
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Logout error:", err);
        }
        // Always clear local state regardless of whether signOut succeeded
        setUser(null);
        localStorage.removeItem("hlms_user");
    };

    const value = {
        user,
        role: user ? (user.role as UserRole) : null,
        login,
        logout,
        isAuthenticated: !!user,
        loading
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

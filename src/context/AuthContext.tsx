
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
    
    // Track ongoing profile fetch to prevent concurrent requests
    const profileFetchInProgress = useRef<string | null>(null);

    const fetchProfile = async (uid: string, email: string): Promise<User | null> => {
        // Prevent concurrent requests for the same user
        if (profileFetchInProgress.current === uid) {
            console.log("[AuthContext] Profile fetch already in progress for UID:", uid);
            return user; // Return current user while fetch completes
        }

        profileFetchInProgress.current = uid;
        
        try {
            console.log("[AuthContext] === PROFILE FETCH START ===");
            console.log("[AuthContext] Getting current session before profile fetch...");
            
            // IMPORTANT: Refresh the session to ensure JWT is loaded on the client
            const sessionStart = Date.now();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            console.log(`[AuthContext] getSession completed in ${Date.now() - sessionStart}ms`, { hasSession: !!session?.user, sessionError: sessionError?.message });
            
            if (!session?.user) {
                console.error("[AuthContext] No valid session for profile query - CLEARING STATE");
                setUser(null);
                setLoading(false);
                return null;
            }

            console.log("[AuthContext] Session valid! Starting profile query...");
            
            // Fetch profile with timeout protection
            const queryStart = Date.now();
            console.log("[AuthContext] About to call supabase.from('profiles').select()...");
            
            const profilePromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();

            let timeoutId: NodeJS.Timeout | null = null;
            let warningTimeoutId: NodeJS.Timeout | null = null;
            
            const timeoutPromise = new Promise<any>((_, reject) => {
                warningTimeoutId = setTimeout(() => {
                    console.warn("[AuthContext] ⚠️ WARNING: Profile fetch has been running for 3 seconds...");
                }, 3000);
                
                timeoutId = setTimeout(() => {
                    console.error("[AuthContext] ⏱️ TIMEOUT: Profile fetch took more than 5 seconds!");
                    reject(new Error("Profile fetch timeout after 5 seconds"));
                }, 5000);
            });
            
            console.log("[AuthContext] Setting up Promise.race with timeout...");
            
            const result = await Promise.race([
                profilePromise,
                timeoutPromise
            ]);
            
            // Clear timeouts on successful completion
            if (timeoutId) clearTimeout(timeoutId);
            if (warningTimeoutId) clearTimeout(warningTimeoutId);
            
            const { data: profile, error } = result;
            const queryDuration = Date.now() - queryStart;
            console.log(`[AuthContext] Profile query completed in ${queryDuration}ms. Error: ${error?.message}, Profile exists: ${!!profile}`);

            if (error || !profile) {
                console.error("[AuthContext] Profile fetch error:", {
                    message: error?.message,
                    code: error?.code,
                    details: error?.details
                });
                
                // Use cache if available to prevent loading forever
                if (cached) {
                    console.log("[AuthContext] ✅ Using cached user as fallback");
                    return cached;
                }
                
                // No cache and no profile - clear loading state
                console.log("[AuthContext] ❌ No cache and no profile - clearing state");
                setUser(null);
                setLoading(false);
                return null;
            }

            const userData: User = {
                id: uid,
                name: profile.full_name,
                email: email,
                role: profile.role === 'student' ? 'learner' : profile.role as UserRole
            };
            console.log("[AuthContext] ✅ Profile fetched successfully, user role:", userData.role);
            setUser(userData);
            localStorage.setItem("hlms_user", JSON.stringify(userData));
            return userData;
        } catch (err) {
            console.error("[AuthContext] ❌ CAUGHT ERROR:", {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            
            // Timeout or error - use cache if available
            const cached = getCachedUser();
            if (cached) {
                console.log("[AuthContext] ✅ Using cached user as fallback (error)");
                return cached;
            }
            
            // No cache and profile fetch failed - clear loading
            console.log("[AuthContext] ❌ Profile fetch failed and no cache, clearing state");
            setUser(null);
            setLoading(false);
            return null;
        } finally {
            // Always clear the fetch-in-progress flag
            profileFetchInProgress.current = null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: Session | null) => {
            console.log("[AuthContext] handleSession called, session exists:", !!session?.user);
            if (!mounted) {
                console.log("[AuthContext] handleSession: component unmounted, returning");
                return;
            }
            if (session?.user) {
                console.log("[AuthContext] handleSession: fetching profile for", session.user.email);
                try {
                    await fetchProfile(session.user.id, session.user.email || "");
                } finally {
                    console.log("[AuthContext] handleSession: setting loading false");
                    if (mounted) setLoading(false);
                }
            } else {
                console.log("[AuthContext] handleSession: no user in session, clearing state");
                setUser(null);
                localStorage.removeItem("hlms_user");
                if (mounted) setLoading(false);
            }
        };

        const initializeAuth = async () => {
            try {
                console.log("[AuthContext] Starting auth initialization...");
                
                // Try to get cached user immediately to unblock UI
                const cachedUser = getCachedUser();
                if (cachedUser) {
                    console.log("[AuthContext] Using cached user for immediate UI response:", cachedUser.email);
                    setUser(cachedUser);
                    setLoading(false); // Unblock UI immediately
                }
                
                // CRITICAL: Get initial session from storage first
                // This ensures session is restored when tab becomes active or page refreshes
                const { data: { session }, error } = await supabase.auth.getSession();
                
                console.log("[AuthContext] getSession completed. Session exists:", !!session?.user);
                
                if (!mounted) {
                    console.log("[AuthContext] Component unmounted, skipping auth init");
                    return;
                }
                
                if (error) {
                    console.error("[AuthContext] Error getting session:", error);
                    if (mounted) {
                        setUser(null);
                        localStorage.removeItem("hlms_user");
                        setLoading(false);
                    }
                    return;
                }

                // Handle the restored session
                if (session?.user) {
                    // If cache exists and matches session user, skip profile fetch
                    if (cachedUser && cachedUser.id === session.user.id) {
                        console.log("[AuthContext] Session matches cache, skipping profile fetch");
                        return;
                    }
                    
                    console.log("[AuthContext] Session found, fetching profile for user:", session.user.email);
                    await fetchProfile(session.user.id, session.user.email || "");
                    // Ensure loading is set to false after profile is fetched
                    if (mounted) {
                        console.log("[AuthContext] Profile fetched, setting loading to false");
                        setLoading(false);
                    }
                } else {
                    console.log("[AuthContext] No session found, clearing auth state");
                    if (mounted) {
                        setUser(null);
                        localStorage.removeItem("hlms_user");
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("[AuthContext] Auth initialization error:", err);
                if (mounted) {
                    setUser(null);
                    localStorage.removeItem("hlms_user");
                    setLoading(false);
                }
            }
        };

        // Initialize auth immediately
        initializeAuth();

        // Subscribe to future auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`[AuthContext] Auth event received: ${event}`);
                if (!mounted) {
                    console.log("[AuthContext] Component unmounted, ignoring auth event");
                    return;
                }

                // Only handle critical auth state changes, skip TOKEN_REFRESH to avoid duplicate fetches
                if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
                    console.log("[AuthContext] Handling session event:", event);
                    await handleSession(session);
                } else if (event === "SIGNED_OUT") {
                    console.log("[AuthContext] User signed out");
                    setUser(null);
                    localStorage.removeItem("hlms_user");
                    if (mounted) setLoading(false);
                } else if (event === "TOKEN_REFRESH") {
                    console.log("[AuthContext] Token refreshed, skipping profile refetch");
                    // Don't refetch profile on token refresh - just mark loading as false
                    if (mounted) setLoading(false);
                } else {
                    console.log("[AuthContext] Other auth event:", event);
                    if (mounted) setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
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

            // Eagerly fetch the profile so the app can render routes immediately
            const user = data.session?.user;
            if (user) {
                await fetchProfile(user.id, user.email || "");
            }

            return { success: true };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Invalid credentials";
            return { success: false, message };
        }
    };

    const logout = async () => {
        try {
            // Call Supabase signOut to clear server-side session
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Logout error:", error);
            }
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            // Always clear local state regardless of whether signOut succeeded
            // This ensures the app state is consistent even if Supabase call fails
            setUser(null);
            localStorage.removeItem("hlms_user");
        }
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

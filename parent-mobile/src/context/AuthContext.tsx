import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getPrimaryChild } from "../lib/auth";
import type { ChildSummary, ParentProfile } from "../types";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  parent: ParentProfile | null;
  children: ChildSummary[];
  activeChildId: string | null;
  activeChild: ChildSummary | null;
  login: (identifier: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  forceLogin: () => void;
  setActiveChildId: (childId: string | null) => void;
  updateParentProfile: (updates: { fullName?: string; email?: string; avatarUrl?: string | null }) => Promise<{ success: boolean; message?: string }>;
  updateParentPassword: (password: string) => Promise<{ success: boolean; message?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type ParentLoginLookupRow = {
  auth_method?: "email" | "phone" | null;
  auth_identifier?: string | null;
};

const AUTH_BOOTSTRAP_TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

async function loadParentBundle(session: Session | null) {
  if (!session?.user) {
    return { parent: null, children: [] as ChildSummary[] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "parent") {
    return { parent: null, children: [] as ChildSummary[] };
  }

  const { data: links } = await supabase
    .from("parent_students")
    .select("student_id, relationship_label, is_primary")
    .eq("parent_id", session.user.id);

  const childIds = (links || []).map((row) => row.student_id);
  if (childIds.length === 0) {
    return {
      parent: {
        id: profile.id,
        fullName: profile.full_name || "Parent",
        email: profile.email,
        role: "parent" as const,
        avatarUrl: profile.avatar_url,
      },
      children: [],
    };
  }

  const [studentsRes, childProfilesRes, gradesRes, classesRes] = await Promise.all([
    supabase.from("students").select("id, administration_number, grade_id, register_class_id, status").in("id", childIds),
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", childIds),
    supabase.from("grades").select("id, name"),
    supabase.from("register_classes").select("id, name"),
  ]);

  const gradeById = new Map((gradesRes.data || []).map((grade) => [grade.id, grade.name]));
  const classById = new Map((classesRes.data || []).map((item) => [item.id, item.name]));
  const childProfileById = new Map((childProfilesRes.data || []).map((item) => [item.id, item]));
  const studentById = new Map((studentsRes.data || []).map((item) => [item.id, item]));

  const children = (links || []).map((link) => {
    const profile = childProfileById.get(link.student_id);
    const student = studentById.get(link.student_id);
    return {
      id: link.student_id,
      fullName: profile?.full_name || "Child",
      avatarUrl: profile?.avatar_url || null,
      administrationNumber: student?.administration_number || null,
      gradeLabel: student?.grade_id ? gradeById.get(student.grade_id) || student.grade_id : null,
      classLabel: student?.register_class_id ? classById.get(student.register_class_id) || student.register_class_id : null,
      status: student?.status || null,
      relationshipLabel: link.relationship_label || "parent",
      isPrimary: link.is_primary || false,
    } satisfies ChildSummary;
  });

  return {
    parent: {
      id: profile.id,
      fullName: profile.full_name || "Parent",
      email: profile.email,
      role: "parent" as const,
      avatarUrl: profile.avatar_url,
    },
    children,
  };
}

async function resolveParentLoginCredentials(identifier: string, pin: string) {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier || !pin.trim()) {
    return { success: false as const, message: "Enter your email or phone number and password/PIN." };
  }

  if (trimmedIdentifier.includes("@")) {
    return {
      success: true as const,
      credentials: { email: trimmedIdentifier.toLowerCase(), password: pin },
    };
  }

  const { data, error } = await supabase.rpc("resolve_parent_login_identifier", {
    p_identifier: trimmedIdentifier,
  });

  if (error) {
    return { success: false as const, message: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as ParentLoginLookupRow | null;
  const authIdentifier = row?.auth_identifier?.trim();
  const authMethod = row?.auth_method;

  if (!authIdentifier || !authMethod) {
    return { success: false as const, message: "We could not find a linked parent account for that phone number." };
  }

  return {
    success: true as const,
    credentials:
      authMethod === "phone"
        ? { phone: authIdentifier, password: pin }
        : { email: authIdentifier.toLowerCase(), password: pin },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [childrenList, setChildrenList] = useState<ChildSummary[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const clearAuthState = () => {
    setSession(null);
    setParent(null);
    setChildrenList([]);
    setActiveChildId(null);
  };

  // Clear the UI immediately. Network sign-out is deliberately best-effort so
  // a stalled refresh request can never leave the portal on its loading screen.
  const forceLogin = () => {
    clearAuthState();
    setLoading(false);
    void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  };

  const refreshSession = async (nextSession: Session | null) => {
    try {
      setSession(nextSession);

      if (!nextSession?.user) {
        clearAuthState();
        return;
      }

      const bundle = await withTimeout(loadParentBundle(nextSession), AUTH_BOOTSTRAP_TIMEOUT_MS, "Session verification");
      if (!bundle.parent) {
        clearAuthState();
        void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        return;
      }

      setParent(bundle.parent);
      setChildrenList(bundle.children);
      setActiveChildId((current) => current || bundle.children[0]?.id || null);
    } catch (error) {
      console.warn("[Auth] session bootstrap failed", error);
      clearAuthState();
      void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), AUTH_BOOTSTRAP_TIMEOUT_MS, "Session lookup");
        if (!mounted) return;
        await refreshSession(data.session ?? null);
      } catch (error) {
        console.warn("[Auth] initial session lookup failed", error);
        if (mounted) {
          clearAuthState();
          void supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      try {
        await refreshSession(nextSession);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, pin: string) => {
    try {
      const resolved = await resolveParentLoginCredentials(identifier, pin);
      if (!resolved.success) {
        return { success: false, message: resolved.message };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        ...resolved.credentials,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data.session) {
        return { success: false, message: "No session returned from Supabase" };
      }

      const bundle = await loadParentBundle(data.session);
      if (!bundle.parent) {
        await supabase.auth.signOut();
        return { success: false, message: "This account is not linked as a parent portal user." };
      }

      await refreshSession(data.session);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      return { success: false, message };
    }
  };

  const logout = async () => {
    clearAuthState();
    await supabase.auth.signOut().catch(() => undefined);
  };

  const activeChild = useMemo(
    () => childrenList.find((child) => child.id === activeChildId) ?? getPrimaryChild(childrenList),
    [activeChildId, childrenList]
  );

  const updateParentProfile = async (updates: { fullName?: string; email?: string; avatarUrl?: string | null }) => {
    if (!session?.user) {
      return { success: false, message: "No authenticated user." };
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: updates.fullName,
        email: updates.email,
        avatar_url: updates.avatarUrl,
      })
      .eq("id", session.user.id)
      .select("id, full_name, email, avatar_url")
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    if (data) {
      setParent({
        id: data.id,
        fullName: data.full_name || updates.fullName || "Parent",
        email: data.email || updates.email || parent?.email || "",
        role: "parent",
        avatarUrl: data.avatar_url,
      });
    }

    return { success: true };
  };

  const updateParentPassword = async (password: string) => {
    if (!session?.user) {
      return { success: false, message: "No authenticated user." };
    }

    const nextPassword = password.trim();
    if (nextPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long." };
    }

    const { error } = await supabase.auth.updateUser({
      password: nextPassword,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        parent,
        children: childrenList,
        activeChildId,
        activeChild,
        login,
        logout,
        forceLogin,
        setActiveChildId,
        updateParentProfile,
        updateParentPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

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
  login: (email: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  setActiveChildId: (childId: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [childrenList, setChildrenList] = useState<ChildSummary[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const refreshSession = async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setParent(null);
      setChildrenList([]);
      setActiveChildId(null);
      return;
    }

    const bundle = await loadParentBundle(nextSession);
    setParent(bundle.parent);
    setChildrenList(bundle.children);
    setActiveChildId((current) => current || bundle.children[0]?.id || null);
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await refreshSession(data.session ?? null);
      if (mounted) setLoading(false);
    };

    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      await refreshSession(nextSession);
      setLoading(false);
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
        password: pin,
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
    await supabase.auth.signOut();
    setSession(null);
    setParent(null);
    setChildrenList([]);
    setActiveChildId(null);
  };

  const activeChild = useMemo(
    () => childrenList.find((child) => child.id === activeChildId) ?? getPrimaryChild(childrenList),
    [activeChildId, childrenList]
  );

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
        setActiveChildId,
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

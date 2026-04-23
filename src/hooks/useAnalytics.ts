import { useEffect, useRef, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface AnalyticsSession {
  sessionId: string;
  userId: string;
  loginTime: string;
}

type PendingLogin = {
  userId: string;
  startedAt: string;
};

const SESSION_STORAGE_KEY = "analytics_session";
const SESSION_PENDING_KEY = "analytics_session_pending";
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const PENDING_LOGIN_MAX_AGE_MS = 15 * 1000;

async function closeAnyOpenSessions(userId: string, logoutTime: string): Promise<void> {
  try {
    const { data: openSessions, error: selectError } = await supabase
      .from("user_sessions")
      .select("id,login_time")
      .eq("user_id", userId)
      .is("logout_time", null);

    if (selectError || !openSessions || openSessions.length === 0) {
      return;
    }

    for (const row of openSessions) {
      const loginTimeRaw = row.login_time;
      if (typeof loginTimeRaw !== "string") continue;

      const durationSeconds = Math.max(
        0,
        Math.floor((new Date(logoutTime).getTime() - new Date(loginTimeRaw).getTime()) / 1000)
      );

      const { error: updateError } = await supabase
        .from("user_sessions")
        .update({
          logout_time: logoutTime,
          session_duration: durationSeconds,
        })
        .eq("id", row.id)
        .eq("user_id", userId);

      if (updateError) {
        console.warn("[Analytics] Failed closing stale open session:", updateError);
      }
    }
  } catch (err) {
    console.warn("[Analytics] Error while closing stale open sessions:", err);
  }
}

function readStoredSession(): AnalyticsSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AnalyticsSession>;
    if (!parsed.sessionId || !parsed.userId || !parsed.loginTime) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      userId: parsed.userId,
      loginTime: parsed.loginTime,
    };
  } catch {
    return null;
  }
}

function readPendingLogin(): PendingLogin | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PENDING_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingLogin>;
    if (!parsed.userId || !parsed.startedAt) return null;

    return {
      userId: parsed.userId,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export const useAnalytics = () => {
  const { user } = useAuth();
  const sessionRef = useRef<AnalyticsSession | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginInFlightRef = useRef(false);
  const logoutInFlightRef = useRef(false);

  const syncSessionFromStorage = useCallback((): AnalyticsSession | null => {
    const stored = readStoredSession();
    sessionRef.current = stored;
    return stored;
  }, []);

  const clearLocalSession = useCallback(() => {
    sessionRef.current = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const trackLogin = useCallback(
    async (userId: string) => {
      if (!userId) return;

      const existingSession = sessionRef.current ?? syncSessionFromStorage();
      if (existingSession?.userId === userId) {
        return;
      }

      if (loginInFlightRef.current) {
        return;
      }

      const pending = readPendingLogin();
      if (
        pending?.userId === userId &&
        Date.now() - new Date(pending.startedAt).getTime() <= PENDING_LOGIN_MAX_AGE_MS
      ) {
        return;
      }

      loginInFlightRef.current = true;
      sessionStorage.setItem(
        SESSION_PENDING_KEY,
        JSON.stringify({ userId, startedAt: new Date().toISOString() })
      );

      try {
        const loginTime = new Date().toISOString();
        await closeAnyOpenSessions(userId, loginTime);

        const { data, error } = await supabase
          .from("user_sessions")
          .insert({
            user_id: userId,
            login_time: loginTime,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Failed to track login:", error);
          return;
        }

        const session: AnalyticsSession = {
          sessionId: data.id,
          userId,
          loginTime,
        };

        sessionRef.current = session;
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        console.log("[Analytics] Session started:", session.sessionId);
      } catch (err) {
        console.error("Error tracking login:", err);
      } finally {
        loginInFlightRef.current = false;
        sessionStorage.removeItem(SESSION_PENDING_KEY);
      }
    },
    [syncSessionFromStorage]
  );

  const trackLogout = useCallback(
    async (reason?: string) => {
      if (logoutInFlightRef.current) {
        return;
      }

      const session = sessionRef.current ?? syncSessionFromStorage();
      if (!session) return;

      logoutInFlightRef.current = true;
      clearLocalSession();

      try {
        const logoutTime = new Date().toISOString();
        const sessionDurationSeconds = Math.max(
          0,
          Math.floor((new Date(logoutTime).getTime() - new Date(session.loginTime).getTime()) / 1000)
        );

        const { error } = await supabase
          .from("user_sessions")
          .update({
            logout_time: logoutTime,
            session_duration: sessionDurationSeconds,
          })
          .eq("id", session.sessionId)
          .eq("user_id", session.userId);

        if (error) {
          console.error("Failed to track logout:", error);
          return;
        }

        console.log("[Analytics] Session ended:", {
          sessionId: session.sessionId,
          duration: sessionDurationSeconds,
          reason: reason || "unknown",
        });
      } catch (err) {
        console.error("Error tracking logout:", err);
      } finally {
        logoutInFlightRef.current = false;
      }
    },
    [clearLocalSession, syncSessionFromStorage]
  );

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      console.log("[Analytics] Inactivity timeout triggered");
      void trackLogout("inactivity");
    }, INACTIVITY_TIMEOUT_MS);
  }, [trackLogout]);

  useEffect(() => {
    if (!user) return;

    const existingSession = syncSessionFromStorage();
    if (existingSession && existingSession.userId !== user.id) {
      sessionRef.current = existingSession;
      void trackLogout("user_switch");
      void trackLogin(user.id);
    } else if (!existingSession) {
      void trackLogin(user.id);
    }

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener("mousedown", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);

    const handleBeforeUnload = () => {
      void trackLogout("tab_close");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (!sessionRef.current && !loginInFlightRef.current) {
        void trackLogin(user.id);
      }

      resetInactivityTimer();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    resetInactivityTimer();

    return () => {
      window.removeEventListener("mousedown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, trackLogin, trackLogout, resetInactivityTimer, syncSessionFromStorage]);

  useEffect(() => {
    if (!user && (sessionRef.current || readStoredSession())) {
      void trackLogout("sign_out");
    }
  }, [user, trackLogout]);

  return {
    trackLogin,
    trackLogout,
    resetInactivityTimer,
  };
};

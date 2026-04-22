import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// ANALYTICS HOOK — Session management + event tracking
// ============================================================================

export interface AnalyticsSession {
  sessionId: string;
  userId: string;
  loginTime: string;
}

const SESSION_STORAGE_KEY = 'analytics_session';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const useAnalytics = () => {
  const { user } = useAuth();
  const sessionRef = useRef<AnalyticsSession | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. LOGIN EVENT (on auth + component mount)
  // ─────────────────────────────────────────────────────────────────────────
  const trackLogin = useCallback(async (userId: string) => {
    try {
      const loginTime = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          login_time: loginTime,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to track login:', error);
        return;
      }

      const session: AnalyticsSession = {
        sessionId: data.id,
        userId,
        loginTime,
      };

      sessionRef.current = session;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      console.log('[Analytics] Session started:', session.sessionId);
    } catch (err) {
      console.error('Error tracking login:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. LOGOUT EVENT
  // ─────────────────────────────────────────────────────────────────────────
  const trackLogout = useCallback(async (reason?: string) => {
    try {
      const session = sessionRef.current;
      if (!session) return;

      const logoutTime = new Date().toISOString();
      const loginTimeDate = new Date(session.loginTime);
      const logoutTimeDate = new Date(logoutTime);
      const sessionDurationSeconds = Math.floor(
        (logoutTimeDate.getTime() - loginTimeDate.getTime()) / 1000
      );

      const { error } = await supabase
        .from('user_sessions')
        .update({
          logout_time: logoutTime,
          session_duration: `${sessionDurationSeconds} seconds`,
        })
        .eq('id', session.sessionId);

      if (error) {
        console.error('Failed to track logout:', error);
        return;
      }

      console.log('[Analytics] Session ended:', {
        sessionId: session.sessionId,
        duration: sessionDurationSeconds,
        reason: reason || 'unknown',
      });

      sessionRef.current = null;
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.error('Error tracking logout:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RESET INACTIVITY TIMER
  // ─────────────────────────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      console.log('[Analytics] Inactivity timeout triggered');
      trackLogout('inactivity');
    }, INACTIVITY_TIMEOUT_MS);
  }, [trackLogout]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. INIT: on user auth + setup logout handlers
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const existingSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!existingSession) {
      trackLogin(user.id);
    }

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    const handleBeforeUnload = () => {
      trackLogout('tab_close');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackLogout('app_background');
      } else {
        trackLogin(user.id);
        resetInactivityTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, trackLogin, trackLogout, resetInactivityTimer]);

  return {
    trackLogin,
    trackLogout,
    resetInactivityTimer,
  };
};

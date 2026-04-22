import { useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// SYSTEM TRACKING HOOK — Performance, Errors, Feedback
// ============================================================================

export const useSystemTracking = () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 10. SYSTEM ERROR REPORT (Global error tracking)
  // ─────────────────────────────────────────────────────────────────────────
  const trackError = useCallback(
    async (error: Error | string, context?: { page?: string; userAgent?: string }) => {
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        const { error: insertError } = await supabase
          .from('system_performance')
          .insert({
            event_type: 'error',
            details: {
              page: context?.page || window.location.pathname,
              message: errorMessage,
              stack: errorStack,
              userAgent: context?.userAgent || navigator.userAgent,
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Failed to track error:', insertError);
          return;
        }

        console.log('[Analytics] Error reported:', errorMessage);
      } catch (err) {
        console.error('Error tracking system error:', err);
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 11. PAGE LOAD TIME (Measure and report load times)
  // ─────────────────────────────────────────────────────────────────────────
  const trackPageLoadTime = useCallback(
    async (page: string, loadTimeMs: number) => {
      try {
        const { error } = await supabase
          .from('system_performance')
          .insert({
            event_type: 'load_time',
            details: {
              page,
              load_time_ms: loadTimeMs,
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          });

        if (error) {
          console.error('Failed to track page load time:', error);
          return;
        }

        console.log('[Analytics] Page load time recorded:', {
          page,
          loadTimeMs,
        });
      } catch (err) {
        console.error('Error tracking page load time:', err);
      }
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Setup global error handler for uncaught exceptions
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(event.error, { page: window.location.pathname });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(event.reason, { page: window.location.pathname });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  // ─────────────────────────────────────────────────────────────────────────
  // Measure Navigation Timing on page load
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.performance && window.performance.timing) {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

      if (pageLoadTime > 0) {
        setTimeout(() => {
          trackPageLoadTime(window.location.pathname, pageLoadTime);
        }, 100);
      }
    }
  }, [trackPageLoadTime]);

  return {
    trackError,
    trackPageLoadTime,
  };
};

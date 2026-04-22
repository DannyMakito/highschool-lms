import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// USER FEEDBACK HOOK
// ============================================================================

export type FeedbackType = 'bug' | 'feature' | 'general';

export const useFeedbackTracking = () => {
  const { user } = useAuth();

  // ─────────────────────────────────────────────────────────────────────────
  // 12. USER FEEDBACK SUBMITTED
  // ─────────────────────────────────────────────────────────────────────────
  const submitFeedback = useCallback(
    async (type: FeedbackType, message: string) => {
      if (!user) return;

      try {
        const { error } = await supabase.from('feedback').insert({
          user_id: user.id,
          type,
          message,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to submit feedback:', error);
          return;
        }

        console.log('[Analytics] Feedback submitted:', { type, message });
      } catch (err) {
        console.error('Error submitting feedback:', err);
      }
    },
    [user]
  );

  return {
    submitFeedback,
  };
};

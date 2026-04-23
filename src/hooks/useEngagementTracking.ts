import { useCallback } from 'react';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// ENGAGEMENT TRACKING HOOK — Lessons, Videos, Assignments
// ============================================================================

export const useEngagementTracking = () => {
  const { user } = useAuth();

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CONTENT OPENED (Lesson viewed)
  // ─────────────────────────────────────────────────────────────────────────
  const trackLessonViewed = useCallback(
    async (lessonId: string) => {
      if (!user || user.role !== 'learner') return;

      try {
        const { error } = await supabase.from('content_interactions').insert({
          user_id: user.id,
          content_type: 'lesson',
          content_id: lessonId,
          action: 'viewed',
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to track lesson view:', error);
          return;
        }

        console.log('[Analytics] Lesson viewed:', lessonId);
      } catch (err) {
        console.error('Error tracking lesson view:', err);
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. VIDEO WATCH (Video watched in lesson)
  // Videos are per lesson; use lesson.id as content_id
  // ─────────────────────────────────────────────────────────────────────────
  const trackVideoWatched = useCallback(
    async (lessonId: string, durationSeconds: number) => {
      if (!user || user.role !== 'learner') return;

      try {
        const { error } = await supabase.from('content_interactions').insert({
          user_id: user.id,
          content_type: 'video',
          content_id: lessonId, // Use lesson ID since videos are per lesson
          action: 'watched',
          duration: durationSeconds,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to track video watch:', error);
          return;
        }

        console.log('[Analytics] Video watched:', {
          lessonId,
          duration: durationSeconds,
        });
      } catch (err) {
        console.error('Error tracking video watch:', err);
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ASSIGNMENT VIEWED
  // ─────────────────────────────────────────────────────────────────────────
  const trackAssignmentViewed = useCallback(
    async (assignmentId: string) => {
      if (!user || user.role !== 'learner') return;

      try {
        const { error } = await supabase.from('content_interactions').insert({
          user_id: user.id,
          content_type: 'assignment',
          content_id: assignmentId,
          action: 'viewed',
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to track assignment view:', error);
          return;
        }

        console.log('[Analytics] Assignment viewed:', assignmentId);
      } catch (err) {
        console.error('Error tracking assignment view:', err);
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 6. ASSIGNMENT SUBMITTED
  // ─────────────────────────────────────────────────────────────────────────
  const trackAssignmentSubmitted = useCallback(
    async (assignmentId: string) => {
      if (!user || user.role !== 'learner') return;

      try {
        const { error } = await supabase.from('content_interactions').insert({
          user_id: user.id,
          content_type: 'assignment',
          content_id: assignmentId,
          action: 'submitted',
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to track assignment submission:', error);
          return;
        }

        console.log('[Analytics] Assignment submitted:', assignmentId);
      } catch (err) {
        console.error('Error tracking assignment submission:', err);
      }
    },
    [user]
  );

  return {
    trackLessonViewed,
    trackVideoWatched,
    trackAssignmentViewed,
    trackAssignmentSubmitted,
  };
};

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// TEACHER ACTIVITY TRACKING HOOK
// ============================================================================

export const useTeacherTracking = () => {
  const { user } = useAuth();

  // ─────────────────────────────────────────────────────────────────────────
  // 7. TEACHER LESSON UPLOADED
  // ─────────────────────────────────────────────────────────────────────────
  const trackLessonUploaded = useCallback(
    async (lessonId: string) => {
      if (!user) return;

      try {
        const { error } = await supabase.from('teacher_activities').insert({
          teacher_id: user.id,
          action: 'lesson_uploaded',
          content_id: lessonId,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to track lesson upload:', error);
          return;
        }

        console.log('[Analytics] Lesson uploaded:', lessonId);
      } catch (err) {
        console.error('Error tracking lesson upload:', err);
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 8. TEACHER ASSIGNMENT CREATED
  // ─────────────────────────────────────────────────────────────────────────
  const trackAssignmentCreated = useCallback(
    async (assignmentId: string) => {
      if (!user) return;

      try {
        const { error } = await supabase.from('teacher_activities').insert({
          teacher_id: user.id,
          action: 'assignment_created',
          content_id: assignmentId,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to track assignment creation:', error);
          return;
        }

        console.log('[Analytics] Assignment created:', assignmentId);
      } catch (err) {
        console.error('Error tracking assignment creation:', err);
      }
    },
    [user]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 9. TEACHER FEEDBACK GIVEN
  // ─────────────────────────────────────────────────────────────────────────
  const trackFeedbackGiven = useCallback(
    async (assignmentId: string) => {
      if (!user) return;

      try {
        const { error } = await supabase.from('teacher_activities').insert({
          teacher_id: user.id,
          action: 'feedback_given',
          content_id: assignmentId,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error('Failed to track feedback:', error);
          return;
        }

        console.log('[Analytics] Feedback given:', assignmentId);
      } catch (err) {
        console.error('Error tracking feedback:', err);
      }
    },
    [user]
  );

  return {
    trackLessonUploaded,
    trackAssignmentCreated,
    trackFeedbackGiven,
  };
};

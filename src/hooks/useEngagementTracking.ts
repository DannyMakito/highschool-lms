import { useCallback } from "react";
import supabase from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const useEngagementTracking = () => {
  const { user } = useAuth();

  const trackLessonViewed = useCallback(
    async (lessonId: string) => {
      if (!user || user.role !== "learner") return;

      try {
        const { error } = await supabase.from("content_interactions").insert({
          user_id: user.id,
          content_type: "lesson",
          content_id: lessonId,
          action: "viewed",
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error("Failed to track lesson view:", error);
          return;
        }

        console.log("[Analytics] Lesson viewed:", lessonId);
      } catch (err) {
        console.error("Error tracking lesson view:", err);
      }
    },
    [user]
  );

  const trackLessonTimeSpent = useCallback(
    async (lessonId: string, durationSeconds: number) => {
      if (!user || user.role !== "learner") return;
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

      try {
        const { error } = await supabase.from("content_interactions").insert({
          user_id: user.id,
          content_type: "lesson",
          content_id: lessonId,
          action: "time_spent",
          duration: Math.round(durationSeconds),
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error("Failed to track lesson time spent:", error);
          return;
        }

        console.log("[Analytics] Lesson time spent:", {
          lessonId,
          duration: Math.round(durationSeconds),
        });
      } catch (err) {
        console.error("Error tracking lesson time spent:", err);
      }
    },
    [user]
  );

  const trackVideoWatched = useCallback(
    async (lessonId: string, durationSeconds: number) => {
      if (!user || user.role !== "learner") return;

      try {
        const { error } = await supabase.from("content_interactions").insert({
          user_id: user.id,
          content_type: "video",
          content_id: lessonId,
          action: "watched",
          duration: durationSeconds,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error("Failed to track video watch:", error);
          return;
        }

        console.log("[Analytics] Video watched:", {
          lessonId,
          duration: durationSeconds,
        });
      } catch (err) {
        console.error("Error tracking video watch:", err);
      }
    },
    [user]
  );

  const trackAssignmentViewed = useCallback(
    async (assignmentId: string) => {
      if (!user || user.role !== "learner") return;

      try {
        const { error } = await supabase.from("content_interactions").insert({
          user_id: user.id,
          content_type: "assignment",
          content_id: assignmentId,
          action: "viewed",
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error("Failed to track assignment view:", error);
          return;
        }

        console.log("[Analytics] Assignment viewed:", assignmentId);
      } catch (err) {
        console.error("Error tracking assignment view:", err);
      }
    },
    [user]
  );

  const trackAssignmentSubmitted = useCallback(
    async (assignmentId: string) => {
      if (!user || user.role !== "learner") return;

      try {
        const { error } = await supabase.from("content_interactions").insert({
          user_id: user.id,
          content_type: "assignment",
          content_id: assignmentId,
          action: "submitted",
          timestamp: new Date().toISOString(),
        });

        if (error) {
          console.error("Failed to track assignment submission:", error);
          return;
        }

        console.log("[Analytics] Assignment submitted:", assignmentId);
      } catch (err) {
        console.error("Error tracking assignment submission:", err);
      }
    },
    [user]
  );

  return {
    trackLessonViewed,
    trackLessonTimeSpent,
    trackVideoWatched,
    trackAssignmentViewed,
    trackAssignmentSubmitted,
  };
};

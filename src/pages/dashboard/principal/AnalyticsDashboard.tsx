import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Clock,
  Gauge,
  RefreshCcw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import supabase from "@/lib/supabase";

type SessionEvent = {
  userId: string;
  loginAt: string;
  logoutAt?: string;
  durationSeconds?: number;
};

type ContentEvent = {
  userId: string;
  contentType: string;
  contentId: string;
  action: string;
  timestamp: string;
};

type TeacherEvent = {
  teacherId: string;
  action: string;
  contentId: string;
  timestamp: string;
};

type SystemEvent = {
  eventType: string;
  details: unknown;
  timestamp: string;
};

type DailyTrend = {
  day: string;
  logins: number;
  interactions: number;
  submissions: number;
};

type ActivityItem = {
  id: string;
  category: "login" | "engagement" | "teacher" | "system";
  label: string;
  timestamp: string;
};

type AnalyticsSnapshot = {
  totalLoginsToday: number;
  uniqueActiveUsersToday: number;
  studentsLoggedInWeekly: number;
  totalStudents: number;
  teachersActiveWeekly: number;
  totalTeachers: number;
  lessonsOpenedToday: number;
  lessonCompletionsToday: number;
  assignmentSubmissionsToday: number;
  totalAssignments: number;
  lessonsUploadedToday: number;
  assignmentsCreatedToday: number;
  feedbackGivenToday: number;
  errorsToday: number;
  averageLoadTimeMs: number;
  averageSessionMinutes: number;
  trends: DailyTrend[];
  actionBreakdown: Array<{ label: string; value: number }>;
  recentActivity: ActivityItem[];
  recentSessions: SessionEvent[];
  recentInteractions: ContentEvent[];
  sourceHints: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDurationToSeconds(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber)) {
      return Math.max(0, asNumber);
    }

    const match = trimmed.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      return Math.max(0, Number(match[1]));
    }
  }

  return undefined;
}

function isValidIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function getEventDate(value: string): Date {
  return new Date(value);
}

function normalizeAction(action: string): string {
  const normalized = action.toLowerCase().trim();
  if (normalized === "viewed") return "open";
  if (normalized === "completed") return "complete";
  return normalized;
}

function actionLabel(action: string): string {
  switch (normalizeAction(action)) {
    case "open":
      return "Opened";
    case "complete":
      return "Completed";
    case "submitted":
      return "Submitted";
    case "watched":
      return "Watched";
    case "lesson_uploaded":
      return "Lesson Uploaded";
    case "assignment_created":
      return "Assignment Created";
    case "feedback_given":
      return "Feedback Given";
    default:
      return action.replace(/_/g, " ");
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

async function tryQueryWithTimestamp(
  table: string,
  select: string,
  timestampColumn: string,
  sinceIso: string
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .gte(timestampColumn, sinceIso)
    .order(timestampColumn, { ascending: false })
    .limit(2000);

  if (error) {
    return null;
  }

  return data ?? [];
}

async function fetchSessionEvents(sinceIso: string): Promise<{ rows: SessionEvent[]; sourceHint: string }> {
  const attempts = [
    {
      select: "user_id,login_time,logout_time,session_duration",
      time: "login_time",
      sourceHint: "user_sessions.login_time",
      map: (row: Record<string, unknown>): SessionEvent | null => {
        if (!isValidIso(row.login_time)) return null;
        return {
          userId: String(row.user_id ?? ""),
          loginAt: row.login_time,
          logoutAt: isValidIso(row.logout_time) ? row.logout_time : undefined,
          durationSeconds: parseDurationToSeconds(row.session_duration),
        };
      },
    },
    {
      select: "user_id,login_at,created_at,session_duration",
      time: "login_at",
      sourceHint: "user_sessions.login_at",
      map: (row: Record<string, unknown>): SessionEvent | null => {
        const loginAt = isValidIso(row.login_at)
          ? row.login_at
          : isValidIso(row.created_at)
            ? row.created_at
            : null;
        if (!loginAt) return null;
        return {
          userId: String(row.user_id ?? ""),
          loginAt,
          durationSeconds: parseDurationToSeconds(row.session_duration),
        };
      },
    },
    {
      select: "user_id,session_start,session_end,session_duration,created_at",
      time: "session_start",
      sourceHint: "user_sessions.session_start",
      map: (row: Record<string, unknown>): SessionEvent | null => {
        const loginAt = isValidIso(row.session_start)
          ? row.session_start
          : isValidIso(row.created_at)
            ? row.created_at
            : null;
        if (!loginAt) return null;
        return {
          userId: String(row.user_id ?? ""),
          loginAt,
          logoutAt: isValidIso(row.session_end) ? row.session_end : undefined,
          durationSeconds: parseDurationToSeconds(row.session_duration),
        };
      },
    },
    {
      select: "user_id,action,event_type,occurred_at,created_at",
      time: "created_at",
      sourceHint: "user_sessions.created_at",
      map: (row: Record<string, unknown>): SessionEvent | null => {
        const candidateType = String(row.action ?? row.event_type ?? "").toLowerCase();
        if (candidateType && candidateType !== "login") return null;

        const loginAt = isValidIso(row.occurred_at)
          ? row.occurred_at
          : isValidIso(row.created_at)
            ? row.created_at
            : null;
        if (!loginAt) return null;

        return {
          userId: String(row.user_id ?? ""),
          loginAt,
        };
      },
    },
    {
      select: "user_id,created_at",
      time: "created_at",
      sourceHint: "user_sessions.created_at",
      map: (row: Record<string, unknown>): SessionEvent | null => {
        if (!isValidIso(row.created_at)) return null;
        return {
          userId: String(row.user_id ?? ""),
          loginAt: row.created_at,
        };
      },
    },
  ];

  for (const attempt of attempts) {
    const data = await tryQueryWithTimestamp("user_sessions", attempt.select, attempt.time, sinceIso);
    if (!data) continue;

    const rows = data
      .map((row) => attempt.map(row as Record<string, unknown>))
      .filter((row): row is SessionEvent => !!row && !!row.userId);
    return { rows, sourceHint: attempt.sourceHint };
  }

  return { rows: [], sourceHint: "user_sessions.unavailable" };
}

async function fetchContentEvents(sinceIso: string): Promise<{ rows: ContentEvent[]; sourceHint: string }> {
  const attempts = [
    {
      select: "user_id,content_type,content_id,action,timestamp",
      time: "timestamp",
      sourceHint: "content_interactions.timestamp",
      map: (row: Record<string, unknown>): ContentEvent | null => {
        if (!isValidIso(row.timestamp)) return null;
        const action = String(row.action ?? "").toLowerCase();
        return {
          userId: String(row.user_id ?? ""),
          contentType: String(row.content_type ?? "unknown").toLowerCase(),
          contentId: String(row.content_id ?? "unknown"),
          action,
          timestamp: row.timestamp,
        };
      },
    },
    {
      select: "user_id,content_type,content_id,interaction_type,created_at",
      time: "created_at",
      sourceHint: "content_interactions.interaction_type",
      map: (row: Record<string, unknown>): ContentEvent | null => {
        if (!isValidIso(row.created_at)) return null;
        return {
          userId: String(row.user_id ?? ""),
          contentType: String(row.content_type ?? "lesson").toLowerCase(),
          contentId: String(row.content_id ?? "unknown"),
          action: String(row.interaction_type ?? "open").toLowerCase(),
          timestamp: row.created_at,
        };
      },
    },
    {
      select: "user_id,lesson_id,interaction_type,created_at",
      time: "created_at",
      sourceHint: "content_interactions.lesson_id",
      map: (row: Record<string, unknown>): ContentEvent | null => {
        if (!isValidIso(row.created_at)) return null;
        return {
          userId: String(row.user_id ?? ""),
          contentType: "lesson",
          contentId: String(row.lesson_id ?? "unknown"),
          action: String(row.interaction_type ?? "open").toLowerCase(),
          timestamp: row.created_at,
        };
      },
    },
    {
      select: "user_id,content_id,action,occurred_at",
      time: "occurred_at",
      sourceHint: "content_interactions.occurred_at",
      map: (row: Record<string, unknown>): ContentEvent | null => {
        if (!isValidIso(row.occurred_at)) return null;
        return {
          userId: String(row.user_id ?? ""),
          contentType: "lesson",
          contentId: String(row.content_id ?? "unknown"),
          action: String(row.action ?? "open").toLowerCase(),
          timestamp: row.occurred_at,
        };
      },
    },
  ];

  for (const attempt of attempts) {
    const data = await tryQueryWithTimestamp("content_interactions", attempt.select, attempt.time, sinceIso);
    if (!data) continue;

    const rows = data
      .map((row) => attempt.map(row as Record<string, unknown>))
      .filter((row): row is ContentEvent => !!row && !!row.userId);
    return { rows, sourceHint: attempt.sourceHint };
  }

  return { rows: [], sourceHint: "content_interactions.unavailable" };
}

async function fetchTeacherEvents(sinceIso: string): Promise<{ rows: TeacherEvent[]; sourceHint: string }> {
  const attempts = [
    {
      select: "teacher_id,action,content_id,timestamp",
      time: "timestamp",
      sourceHint: "teacher_activities.timestamp",
      map: (row: Record<string, unknown>): TeacherEvent | null => {
        if (!isValidIso(row.timestamp)) return null;
        return {
          teacherId: String(row.teacher_id ?? ""),
          action: String(row.action ?? "").toLowerCase(),
          contentId: String(row.content_id ?? "unknown"),
          timestamp: row.timestamp,
        };
      },
    },
    {
      select: "teacher_id,action,content_id,created_at",
      time: "created_at",
      sourceHint: "teacher_activities.created_at",
      map: (row: Record<string, unknown>): TeacherEvent | null => {
        if (!isValidIso(row.created_at)) return null;
        return {
          teacherId: String(row.teacher_id ?? ""),
          action: String(row.action ?? "").toLowerCase(),
          contentId: String(row.content_id ?? "unknown"),
          timestamp: row.created_at,
        };
      },
    },
  ];

  for (const attempt of attempts) {
    const data = await tryQueryWithTimestamp("teacher_activities", attempt.select, attempt.time, sinceIso);
    if (!data) continue;

    const rows = data
      .map((row) => attempt.map(row as Record<string, unknown>))
      .filter((row): row is TeacherEvent => !!row && !!row.teacherId);
    return { rows, sourceHint: attempt.sourceHint };
  }

  return { rows: [], sourceHint: "teacher_activities.unavailable" };
}

async function fetchSystemEvents(sinceIso: string): Promise<{ rows: SystemEvent[]; sourceHint: string }> {
  const attempts = [
    {
      select: "event_type,details,timestamp",
      time: "timestamp",
      sourceHint: "system_performance.timestamp",
      map: (row: Record<string, unknown>): SystemEvent | null => {
        if (!isValidIso(row.timestamp)) return null;
        return {
          eventType: String(row.event_type ?? "unknown").toLowerCase(),
          details: row.details,
          timestamp: row.timestamp,
        };
      },
    },
    {
      select: "event_type,details,created_at",
      time: "created_at",
      sourceHint: "system_performance.created_at",
      map: (row: Record<string, unknown>): SystemEvent | null => {
        if (!isValidIso(row.created_at)) return null;
        return {
          eventType: String(row.event_type ?? "unknown").toLowerCase(),
          details: row.details,
          timestamp: row.created_at,
        };
      },
    },
  ];

  for (const attempt of attempts) {
    const data = await tryQueryWithTimestamp("system_performance", attempt.select, attempt.time, sinceIso);
    if (!data) continue;

    const rows = data
      .map((row) => attempt.map(row as Record<string, unknown>))
      .filter((row): row is SystemEvent => !!row);
    return { rows, sourceHint: attempt.sourceHint };
  }

  return { rows: [], sourceHint: "system_performance.unavailable" };
}

async function fetchCountFromTable(
  table: string,
  select: string,
  timeColumn: string,
  sinceIso: string
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .gte(timeColumn, sinceIso)
    .limit(2000);

  if (error) return 0;
  return (data ?? []).length;
}

export default function AnalyticsDashboard() {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const now = Date.now();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayIso = startOfToday.toISOString();
      const startOfWeekIso = new Date(startOfToday.getTime() - 6 * DAY_MS).toISOString();

      const [
        sessionsResult,
        contentResult,
        teacherResult,
        systemResult,
        profilesResult,
        assignmentsResult,
      ] = await Promise.all([
        fetchSessionEvents(startOfWeekIso),
        fetchContentEvents(startOfWeekIso),
        fetchTeacherEvents(startOfWeekIso),
        fetchSystemEvents(startOfWeekIso),
        supabase.from("profiles").select("id,role,full_name"),
        supabase.from("assignments").select("id"),
      ]);

      const profiles = profilesResult.error ? [] : profilesResult.data ?? [];
      const profileMap = new Map<string, { role?: string; full_name?: string }>();
      profiles.forEach((profile) => {
        profileMap.set(profile.id, {
          role: profile.role,
          full_name: profile.full_name,
        });
      });

      const sessions = sessionsResult.rows;
      const contentEvents = contentResult.rows;
      const teacherEvents = teacherResult.rows;
      const systemEvents = systemResult.rows;

      const sessionsToday = sessions.filter((event) => getEventDate(event.loginAt) >= startOfToday);
      const contentToday = contentEvents.filter((event) => getEventDate(event.timestamp) >= startOfToday);
      const teacherToday = teacherEvents.filter((event) => getEventDate(event.timestamp) >= startOfToday);
      const systemToday = systemEvents.filter((event) => getEventDate(event.timestamp) >= startOfToday);

      const weeklyActiveUsers = new Set(sessions.map((event) => event.userId));
      const uniqueActiveUsersToday = new Set(sessionsToday.map((event) => event.userId)).size;

      const studentProfiles = profiles.filter((p) => p.role === "student");
      const teacherProfiles = profiles.filter((p) => p.role === "teacher");

      const studentsLoggedInWeekly = studentProfiles.filter((p) => weeklyActiveUsers.has(p.id)).length;
      const teachersActiveWeekly = teacherProfiles.filter((p) => weeklyActiveUsers.has(p.id)).length;

      const lessonOpenActions = new Set(["open", "viewed"]);
      const lessonCompleteActions = new Set(["complete", "completed"]);
      const assignmentSubmissionActions = new Set(["submitted", "complete", "completed"]);

      const lessonsOpenedToday = contentToday.filter(
        (event) => event.contentType === "lesson" && lessonOpenActions.has(event.action)
      ).length;

      const lessonCompletionsToday = contentToday.filter(
        (event) => event.contentType === "lesson" && lessonCompleteActions.has(event.action)
      ).length;

      const analyticsAssignmentSubmissions = contentToday.filter(
        (event) =>
          event.contentType === "assignment" && assignmentSubmissionActions.has(normalizeAction(event.action))
      ).length;

      const fallbackAssignmentSubmissions = await fetchCountFromTable(
        "assignment_submissions",
        "id",
        "submitted_at",
        startOfTodayIso
      );

      const assignmentSubmissionsToday =
        analyticsAssignmentSubmissions > 0 ? analyticsAssignmentSubmissions : fallbackAssignmentSubmissions;

      const sessionDurations = sessions
        .map((event) => event.durationSeconds)
        .filter((duration): duration is number => typeof duration === "number" && duration > 0);

      const averageSessionMinutes =
        sessionDurations.length > 0
          ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length / 60
          : 0;

      const lessonsUploadedTracked = teacherToday.filter((event) => event.action === "lesson_uploaded").length;
      const assignmentsCreatedTracked = teacherToday.filter((event) => event.action === "assignment_created").length;
      const feedbackGivenToday = teacherToday.filter((event) => event.action === "feedback_given").length;

      const fallbackLessonsToday = await fetchCountFromTable("lessons", "id", "created_at", startOfTodayIso);
      const fallbackAssignmentsToday = await fetchCountFromTable("assignments", "id", "created_at", startOfTodayIso);

      const lessonsUploadedToday = lessonsUploadedTracked > 0 ? lessonsUploadedTracked : fallbackLessonsToday;
      const assignmentsCreatedToday =
        assignmentsCreatedTracked > 0 ? assignmentsCreatedTracked : fallbackAssignmentsToday;

      const errorsToday = systemToday.filter((event) => event.eventType === "error").length;
      const loadTimeEvents = systemToday
        .filter((event) => event.eventType === "load_time")
        .map((event) => {
          if (!event.details || typeof event.details !== "object") return null;
          const maybeLoadTime = (event.details as Record<string, unknown>).load_time_ms;
          return typeof maybeLoadTime === "number" ? maybeLoadTime : Number(maybeLoadTime ?? NaN);
        })
        .filter((value): value is number => Number.isFinite(value) && value > 0);

      const averageLoadTimeMs =
        loadTimeEvents.length > 0
          ? loadTimeEvents.reduce((sum, value) => sum + value, 0) / loadTimeEvents.length
          : 0;

      const trends: DailyTrend[] = Array.from({ length: 7 }).map((_, index) => {
        const dayStart = new Date(startOfToday.getTime() - (6 - index) * DAY_MS);
        const dayEnd = new Date(dayStart.getTime() + DAY_MS);
        const label = dayStart.toLocaleDateString(undefined, { weekday: "short" });

        const dayLogins = sessions.filter((event) => {
          const time = getEventDate(event.loginAt).getTime();
          return time >= dayStart.getTime() && time < dayEnd.getTime();
        }).length;

        const dayInteractions = contentEvents.filter((event) => {
          const time = getEventDate(event.timestamp).getTime();
          return time >= dayStart.getTime() && time < dayEnd.getTime();
        }).length;

        const daySubmissions = contentEvents.filter((event) => {
          const time = getEventDate(event.timestamp).getTime();
          return (
            time >= dayStart.getTime() &&
            time < dayEnd.getTime() &&
            event.contentType === "assignment" &&
            assignmentSubmissionActions.has(normalizeAction(event.action))
          );
        }).length;

        return {
          day: label,
          logins: dayLogins,
          interactions: dayInteractions,
          submissions: daySubmissions,
        };
      });

      const actionCounts = contentToday.reduce((acc, event) => {
        const key = normalizeAction(event.action);
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());

      const actionBreakdown = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([action, value]) => ({ label: actionLabel(action), value }));

      const recentActivity: ActivityItem[] = [
        ...sessions.slice(0, 20).map((event, index) => {
          const name = profileMap.get(event.userId)?.full_name ?? "Unknown user";
          return {
            id: `login-${event.userId}-${index}`,
            category: "login" as const,
            label: `${name} logged in`,
            timestamp: event.loginAt,
          };
        }),
        ...contentEvents.slice(0, 20).map((event, index) => {
          const name = profileMap.get(event.userId)?.full_name ?? "Unknown user";
          return {
            id: `content-${event.userId}-${index}`,
            category: "engagement" as const,
            label: `${name} ${actionLabel(event.action).toLowerCase()} ${event.contentType}`,
            timestamp: event.timestamp,
          };
        }),
        ...teacherEvents.slice(0, 20).map((event, index) => {
          const name = profileMap.get(event.teacherId)?.full_name ?? "Unknown teacher";
          return {
            id: `teacher-${event.teacherId}-${index}`,
            category: "teacher" as const,
            label: `${name} ${actionLabel(event.action).toLowerCase()}`,
            timestamp: event.timestamp,
          };
        }),
        ...systemEvents.slice(0, 10).map((event, index) => ({
          id: `system-${event.eventType}-${index}`,
          category: "system" as const,
          label: event.eventType === "error" ? "System error captured" : "Page performance recorded",
          timestamp: event.timestamp,
        })),
      ]
        .sort((a, b) => getEventDate(b.timestamp).getTime() - getEventDate(a.timestamp).getTime())
        .slice(0, 12);

      setSnapshot({
        totalLoginsToday: sessionsToday.length,
        uniqueActiveUsersToday,
        studentsLoggedInWeekly,
        totalStudents: studentProfiles.length,
        teachersActiveWeekly,
        totalTeachers: teacherProfiles.length,
        lessonsOpenedToday,
        lessonCompletionsToday,
        assignmentSubmissionsToday,
        totalAssignments: assignmentsResult.error ? 0 : (assignmentsResult.data ?? []).length,
        lessonsUploadedToday,
        assignmentsCreatedToday,
        feedbackGivenToday,
        errorsToday,
        averageLoadTimeMs,
        averageSessionMinutes,
        trends,
        actionBreakdown,
        recentActivity,
        recentSessions: sessionsToday.slice(0, 6),
        recentInteractions: contentToday.slice(0, 6),
        sourceHints: [
          sessionsResult.sourceHint,
          contentResult.sourceHint,
          teacherResult.sourceHint,
          systemResult.sourceHint,
        ],
      });
      setLastUpdated(new Date(now));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load analytics";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics();
  }, []);

  const rates = useMemo(() => {
    if (!snapshot) {
      return {
        adoptionRate: 0,
        teacherActivityRate: 0,
        assignmentSubmissionRate: 0,
      };
    }

    const adoptionRate =
      snapshot.totalStudents > 0
        ? Math.round((snapshot.studentsLoggedInWeekly / snapshot.totalStudents) * 100)
        : 0;
    const teacherActivityRate =
      snapshot.totalTeachers > 0
        ? Math.round((snapshot.teachersActiveWeekly / snapshot.totalTeachers) * 100)
        : 0;
    const assignmentSubmissionRate =
      snapshot.totalAssignments > 0
        ? Math.round((snapshot.assignmentSubmissionsToday / snapshot.totalAssignments) * 100)
        : 0;

    return {
      adoptionRate,
      teacherActivityRate,
      assignmentSubmissionRate,
    };
  }, [snapshot]);

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Card key={idx}>
              <CardHeader>
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-600" />
        <h2 className="text-lg font-semibold text-red-900">Unable to load analytics</h2>
        <p className="mt-2 text-sm text-red-800">{error ?? "Unknown error"}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void fetchAnalytics()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live operational signal from usage, learning activity, and system health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : "just now"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => void fetchAnalytics(true)}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-blue-900">
              Active Users Today
              <Users className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-900">{snapshot.uniqueActiveUsersToday}</p>
            <p className="text-xs text-blue-700">{snapshot.totalLoginsToday} total logins</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-emerald-900">
              Lesson Activity
              <BookOpen className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-emerald-900">{snapshot.lessonsOpenedToday}</p>
            <p className="text-xs text-emerald-700">
              {snapshot.lessonCompletionsToday} completions today
            </p>
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-violet-900">
              Assignment Submissions
              <TrendingUp className="h-4 w-4 text-violet-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-violet-900">{snapshot.assignmentSubmissionsToday}</p>
            <p className="text-xs text-violet-700">
              {rates.assignmentSubmissionRate}% of {snapshot.totalAssignments} assignments
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-amber-900">
              System Health
              <Gauge className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-amber-900">{snapshot.errorsToday}</p>
            <p className="text-xs text-amber-700">
              {Math.round(snapshot.averageLoadTimeMs)}ms average load time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adoption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Student weekly adoption</span>
              <span className="font-semibold">{rates.adoptionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Students active</span>
              <span className="font-semibold">
                {snapshot.studentsLoggedInWeekly}/{snapshot.totalStudents}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Teacher activity rate</span>
              <span className="font-semibold">{rates.teacherActivityRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teacher Output Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lessons uploaded</span>
              <span className="font-semibold">{snapshot.lessonsUploadedToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assignments created</span>
              <span className="font-semibold">{snapshot.assignmentsCreatedToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Feedback events</span>
              <span className="font-semibold">{snapshot.feedbackGivenToday}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg session length</span>
              <span className="font-semibold">{Math.round(snapshot.averageSessionMinutes)} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Recent logins</span>
              <span className="font-semibold">{snapshot.recentSessions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Recent interactions</span>
              <span className="font-semibold">{snapshot.recentInteractions.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-sky-600" />
              Last 7 Days Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.trends} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="logins"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLogins)"
                  name="Logins"
                />
                <Area
                  type="monotone"
                  dataKey="interactions"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInteractions)"
                  name="Interactions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-4 w-4 text-indigo-600" />
              Interaction Mix Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.actionBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">No content interaction events recorded today.</p>
            )}
            {snapshot.actionBreakdown.map((item) => {
              const maxValue = snapshot.actionBreakdown[0]?.value ?? 1;
              const widthPercent = Math.max(8, Math.round((item.value / maxValue) * 100));
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-slate-600" />
            Recent Platform Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent events were found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.recentActivity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.label}</TableCell>
                    <TableCell>{formatTime(item.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Data sources:</span>
        {snapshot.sourceHints.map((source) => (
          <Badge key={source} variant="secondary" className="font-mono text-[10px]">
            {source}
          </Badge>
        ))}
      </div>
    </div>
  );
}

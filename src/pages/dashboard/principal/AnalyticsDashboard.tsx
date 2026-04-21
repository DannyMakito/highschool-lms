import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  FileText,
  MessageSquare,
  AlertTriangle,
  Zap,
  Activity,
  Target,
  BarChart3
} from "lucide-react";
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  // Adoption
  totalLoginsToday: number;
  uniqueActiveUsersToday: number;
  studentsLoggedInWeekly: number;
  totalStudents: number;
  teachersActiveWeekly: number;
  totalTeachers: number;

  // Engagement
  lessonsOpenedToday: number;
  averageSessionDuration: number;
  assignmentSubmissionsToday: number;
  totalAssignments: number;

  // Teacher Activity
  lessonsUploadedToday: number;
  assignmentsCreatedToday: number;
  feedbackGivenToday: number;

  // Performance
  errorRate: number;
  averageLoadTime: number;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Adoption metrics
      const { data: sessionsToday, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('user_id, login_time, logout_time, session_duration')
        .gte('login_time', `${todayStr}T00:00:00.000Z`)
        .lt('login_time', `${todayStr}T23:59:59.999Z`);

      if (sessionsError) throw sessionsError;

      const totalLoginsToday = sessionsToday?.length || 0;
      const uniqueActiveUsersToday = new Set(sessionsToday?.map(s => s.user_id)).size;

      // Students logged in weekly
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student');

      if (studentsError) throw studentsError;

      const { data: sessionsWeekly, error: sessionsWeeklyError } = await supabase
        .from('user_sessions')
        .select('user_id')
        .gte('login_time', `${weekAgoStr}T00:00:00.000Z`);

      if (sessionsWeeklyError) throw sessionsWeeklyError;

      const activeUserIds = new Set(sessionsWeekly?.map(s => s.user_id));
      const studentsLoggedInWeekly = students?.filter(s => activeUserIds.has(s.id)).length || 0;
      const totalStudents = students?.length || 0;

      // Teachers active weekly
      const { data: teachers, error: teachersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'teacher');

      if (teachersError) throw teachersError;

      const teachersActiveWeekly = teachers?.filter(t => activeUserIds.has(t.id)).length || 0;
      const totalTeachers = teachers?.length || 0;

      // Engagement metrics - lessons opened today
      const { data: lessonViews, error: lessonViewsError } = await supabase
        .from('content_interactions')
        .select('*')
        .eq('content_type', 'lesson')
        .eq('action', 'viewed')
        .gte('timestamp', `${todayStr}T00:00:00.000Z`);

      if (lessonViewsError) throw lessonViewsError;

      const lessonsOpenedToday = lessonViews?.length || 0;

      // Average session duration
      const validSessions = sessionsToday?.filter(s => s.session_duration) || [];
      const averageSessionDuration = validSessions.length > 0
        ? validSessions.reduce((acc, s) => {
            const durationStr = s.session_duration;
            const seconds = durationStr ? parseInt(durationStr.split(' ')[0]) : 0;
            return acc + seconds;
          }, 0) / validSessions.length
        : 0;

      // Assignment submissions today
      const { data: assignmentSubmissions, error: submissionsError } = await supabase
        .from('content_interactions')
        .select('*')
        .eq('content_type', 'assignment')
        .eq('action', 'submitted')
        .gte('timestamp', `${todayStr}T00:00:00.000Z`);

      if (submissionsError) throw submissionsError;

      const assignmentSubmissionsToday = assignmentSubmissions?.length || 0;

      // Total assignments (from teacher_activities)
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('teacher_activities')
        .select('content_id')
        .eq('action', 'assignment_created');

      if (assignmentsError) throw assignmentsError;

      const totalAssignments = new Set(allAssignments?.map(a => a.content_id)).size;

      // Teacher activity - lessons uploaded today
      const { data: lessonsUploaded, error: lessonsError } = await supabase
        .from('teacher_activities')
        .select('*')
        .eq('action', 'lesson_uploaded')
        .gte('timestamp', `${todayStr}T00:00:00.000Z`);

      if (lessonsError) throw lessonsError;

      const lessonsUploadedToday = lessonsUploaded?.length || 0;

      // Assignments created today
      const { data: assignmentsCreated, error: assignmentsCreatedError } = await supabase
        .from('teacher_activities')
        .select('*')
        .eq('action', 'assignment_created')
        .gte('timestamp', `${todayStr}T00:00:00.000Z`);

      if (assignmentsCreatedError) throw assignmentsCreatedError;

      const assignmentsCreatedToday = assignmentsCreated?.length || 0;

      // Feedback given today
      const { data: feedbackGiven, error: feedbackError } = await supabase
        .from('teacher_activities')
        .select('*')
        .eq('action', 'feedback_given')
        .gte('timestamp', `${todayStr}T00:00:00.000Z`);

      if (feedbackError) throw feedbackError;

      const feedbackGivenToday = feedbackGiven?.length || 0;

      // Performance metrics
      const { data: errorsToday, error: errorsError } = await supabase
        .from('system_performance')
        .select('*')
        .eq('event_type', 'error')
        .gte('timestamp', `${todayStr}T00:00:00.000Z`);

      if (errorsError) throw errorsError;

      const errorRate = errorsToday?.length || 0;

      const { data: loadTimes, error: loadTimesError } = await supabase
        .from('system_performance')
        .select('details')
        .eq('event_type', 'load_time')
        .gte('timestamp', `${todayStr}T00:00:00.000Z`);

      if (loadTimesError) throw loadTimesError;

      const validLoadTimes = loadTimes?.filter(lt => lt.details?.load_time_ms).map(lt => lt.details.load_time_ms) || [];
      const averageLoadTime = validLoadTimes.length > 0
        ? validLoadTimes.reduce((acc, time) => acc + time, 0) / validLoadTimes.length
        : 0;

      setData({
        totalLoginsToday,
        uniqueActiveUsersToday,
        studentsLoggedInWeekly,
        totalStudents,
        teachersActiveWeekly,
        totalTeachers,
        lessonsOpenedToday,
        averageSessionDuration,
        assignmentSubmissionsToday,
        totalAssignments,
        lessonsUploadedToday,
        assignmentsCreatedToday,
        feedbackGivenToday,
        errorRate,
        averageLoadTime,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-1" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 pb-12">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const adoptionRate = data.totalStudents > 0 ? Math.round((data.studentsLoggedInWeekly / data.totalStudents) * 100) : 0;
  const teacherActivityRate = data.totalTeachers > 0 ? Math.round((data.teachersActiveWeekly / data.totalTeachers) * 100) : 0;
  const engagementRate = data.totalAssignments > 0 ? Math.round((data.assignmentSubmissionsToday / data.totalAssignments) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground font-medium">
            Real-time insights into platform adoption, engagement, and performance.
          </p>
        </div>
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Adoption Metrics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-500" />
          Adoption Metrics
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-blue-900">Total Logins Today</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-900">{data.totalLoginsToday}</div>
              <p className="text-xs text-blue-700 mt-1">Sessions started</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-green-900">Unique Active Users</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-900">{data.uniqueActiveUsersToday}</div>
              <p className="text-xs text-green-700 mt-1">Distinct users today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-purple-900">Student Adoption</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-purple-900">{adoptionRate}%</div>
              <p className="text-xs text-purple-700 mt-1">{data.studentsLoggedInWeekly}/{data.totalStudents} active this week</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-orange-900">Teacher Activity</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-orange-900">{teacherActivityRate}%</div>
              <p className="text-xs text-orange-700 mt-1">{data.teachersActiveWeekly}/{data.totalTeachers} active this week</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-emerald-500" />
          Engagement Metrics
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-emerald-900">Lessons Opened Today</CardTitle>
              <BookOpen className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-900">{data.lessonsOpenedToday}</div>
              <p className="text-xs text-emerald-700 mt-1">Content interactions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-cyan-900">Avg Session Duration</CardTitle>
              <Clock className="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-cyan-900">{Math.round(data.averageSessionDuration)}m</div>
              <p className="text-xs text-cyan-700 mt-1">Minutes per session</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-indigo-900">Assignment Submissions</CardTitle>
              <FileText className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-indigo-900">{data.assignmentSubmissionsToday}</div>
              <p className="text-xs text-indigo-700 mt-1">Submitted today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-pink-900">Engagement Rate</CardTitle>
              <Target className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-pink-900">{engagementRate}%</div>
              <p className="text-xs text-pink-700 mt-1">Of total assignments</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Teacher Activity */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-500" />
          Teacher Activity
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-amber-900">Lessons Uploaded Today</CardTitle>
              <BookOpen className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-900">{data.lessonsUploadedToday}</div>
              <p className="text-xs text-amber-700 mt-1">New content added</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-rose-900">Assignments Created</CardTitle>
              <FileText className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-rose-900">{data.assignmentsCreatedToday}</div>
              <p className="text-xs text-rose-700 mt-1">Created today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-teal-900">Feedback Given</CardTitle>
              <MessageSquare className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-teal-900">{data.feedbackGivenToday}</div>
              <p className="text-xs text-teal-700 mt-1">Student interactions</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Zap className="h-6 w-6 text-red-500" />
          System Performance
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-red-900">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-900">{data.errorRate}%</div>
              <p className="text-xs text-red-700 mt-1">System errors</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-gray-900">Avg Load Time</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{data.averageLoadTime}ms</div>
              <p className="text-xs text-gray-700 mt-1">Page load performance</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

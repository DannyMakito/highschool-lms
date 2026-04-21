import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  BarChart3,
  Eye
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

interface LoginDetail {
  user_id: string;
  login_time: string;
  logout_time?: string;
  session_duration?: string;
  user_name?: string;
  user_role?: string;
}

interface ContentInteractionDetail {
  user_id: string;
  content_type: string;
  content_id: string;
  action: string;
  timestamp: string;
  duration?: string;
  user_name?: string;
}

interface TeacherActivityDetail {
  teacher_id: string;
  action: string;
  content_id: string;
  timestamp: string;
  teacher_name?: string;
}

interface SystemPerformanceDetail {
  event_type: string;
  details: any;
  timestamp: string;
}

type DetailData = LoginDetail[] | ContentInteractionDetail[] | TeacherActivityDetail[] | SystemPerformanceDetail[];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<DetailData>([]);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailType, setDetailType] = useState<"logins" | "engagement" | "teacher" | "performance">("logins");

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

  // ─────────────────────────────────────────────────────────────────────────
  // DETAIL FETCHING FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLoginDetails = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select(`
        user_id,
        login_time,
        logout_time,
        session_duration,
        profiles:user_id (
          full_name,
          role
        )
      `)
      .gte('login_time', `${todayStr}T00:00:00.000Z`)
      .lt('login_time', `${todayStr}T23:59:59.999Z`)
      .order('login_time', { ascending: false });

    if (error) throw error;

    return sessions?.map(session => ({
      user_id: session.user_id,
      login_time: session.login_time,
      logout_time: session.logout_time,
      session_duration: session.session_duration,
      user_name: session.profiles?.full_name || 'Unknown',
      user_role: session.profiles?.role || 'Unknown',
    })) || [];
  };

  const fetchEngagementDetails = async (type: 'lessons' | 'assignments') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const contentType = type === 'lessons' ? 'lesson' : 'assignment';
    const action = type === 'lessons' ? 'viewed' : 'submitted';

    const { data: interactions, error } = await supabase
      .from('content_interactions')
      .select(`
        user_id,
        content_type,
        content_id,
        action,
        timestamp,
        duration,
        profiles:user_id (
          full_name
        )
      `)
      .eq('content_type', contentType)
      .eq('action', action)
      .gte('timestamp', `${todayStr}T00:00:00.000Z`)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return interactions?.map(interaction => ({
      user_id: interaction.user_id,
      content_type: interaction.content_type,
      content_id: interaction.content_id,
      action: interaction.action,
      timestamp: interaction.timestamp,
      duration: interaction.duration,
      user_name: interaction.profiles?.full_name || 'Unknown',
    })) || [];
  };

  const fetchTeacherActivityDetails = async (type: 'lessons' | 'assignments' | 'feedback') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let action: string;
    if (type === 'lessons') action = 'lesson_uploaded';
    else if (type === 'assignments') action = 'assignment_created';
    else action = 'feedback_given';

    const { data: activities, error } = await supabase
      .from('teacher_activities')
      .select(`
        teacher_id,
        action,
        content_id,
        timestamp,
        profiles:teacher_id (
          full_name
        )
      `)
      .eq('action', action)
      .gte('timestamp', `${todayStr}T00:00:00.000Z`)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return activities?.map(activity => ({
      teacher_id: activity.teacher_id,
      action: activity.action,
      content_id: activity.content_id,
      timestamp: activity.timestamp,
      teacher_name: activity.profiles?.full_name || 'Unknown',
    })) || [];
  };

  const fetchPerformanceDetails = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const { data: performance, error } = await supabase
      .from('system_performance')
      .select('*')
      .gte('timestamp', `${todayStr}T00:00:00.000Z`)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return performance || [];
  };

  const fetchWeeklyActiveUsers = async (role: 'student' | 'teacher') => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select(`
        user_id,
        login_time,
        profiles:user_id (
          full_name,
          role
        )
      `)
      .gte('login_time', `${weekAgoStr}T00:00:00.000Z`)
      .eq('profiles.role', role)
      .order('login_time', { ascending: false });

    if (error) throw error;

    // Get unique users
    const uniqueUsers = new Map();
    sessions?.forEach(session => {
      if (!uniqueUsers.has(session.user_id)) {
        uniqueUsers.set(session.user_id, {
          user_id: session.user_id,
          login_time: session.login_time,
          user_name: session.profiles?.full_name || 'Unknown',
          user_role: session.profiles?.role || role,
        });
      }
    });

    return Array.from(uniqueUsers.values());
  };

  const handleCardClick = async (metricType: typeof detailType, title: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    setDetailTitle(title);
    setDetailType(metricType);

    try {
      let data: DetailData = [];

      switch (metricType) {
        case 'logins':
          if (title === 'Total Logins Today') {
            data = await fetchLoginDetails();
          } else if (title === 'Student Adoption') {
            // Fetch students who logged in this week
            data = await fetchWeeklyActiveUsers('student');
          } else if (title === 'Teacher Activity') {
            // Fetch teachers who logged in this week
            data = await fetchWeeklyActiveUsers('teacher');
          }
          break;
        case 'engagement':
          if (title.includes('Lessons')) {
            data = await fetchEngagementDetails('lessons');
          } else if (title.includes('Assignment')) {
            data = await fetchEngagementDetails('assignments');
          }
          break;
        case 'teacher':
          if (title.includes('Lessons')) {
            data = await fetchTeacherActivityDetails('lessons');
          } else if (title.includes('Assignments')) {
            data = await fetchTeacherActivityDetails('assignments');
          } else if (title.includes('Feedback')) {
            data = await fetchTeacherActivityDetails('feedback');
          }
          break;
        case 'performance':
          data = await fetchPerformanceDetails();
          break;
      }

      setDetailData(data);
    } catch (err: any) {
      console.error('Error fetching details:', err);
      setDetailData([]);
    } finally {
      setDetailLoading(false);
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
          <Card 
            className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('logins', 'Total Logins Today')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-blue-900">Total Logins Today</CardTitle>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <Eye className="h-3 w-3 text-blue-500 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-900">{data.totalLoginsToday}</div>
              <p className="text-xs text-blue-700 mt-1">Sessions started</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-green-900">Unique Active Users</CardTitle>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <Eye className="h-3 w-3 text-green-500 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-900">{data.uniqueActiveUsersToday}</div>
              <p className="text-xs text-green-700 mt-1">Distinct users today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-purple-900">Student Adoption</CardTitle>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <Eye className="h-3 w-3 text-purple-500 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-purple-900">{adoptionRate}%</div>
              <p className="text-xs text-purple-700 mt-1">{data.studentsLoggedInWeekly}/{data.totalStudents} active this week</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-orange-900">Teacher Activity</CardTitle>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                <Eye className="h-3 w-3 text-orange-500 opacity-60" />
              </div>
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
          <Card 
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('engagement', 'Lessons Opened Today')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-emerald-900">Lessons Opened Today</CardTitle>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <Eye className="h-3 w-3 text-emerald-500 opacity-60" />
              </div>
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

          <Card 
            className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('engagement', 'Assignment Submissions')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-indigo-900">Assignment Submissions</CardTitle>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <Eye className="h-3 w-3 text-indigo-500 opacity-60" />
              </div>
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
          <Card 
            className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('teacher', 'Lessons Uploaded Today')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-amber-900">Lessons Uploaded Today</CardTitle>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
                <Eye className="h-3 w-3 text-amber-500 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-900">{data.lessonsUploadedToday}</div>
              <p className="text-xs text-amber-700 mt-1">New content added</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('teacher', 'Assignments Created')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-rose-900">Assignments Created</CardTitle>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-rose-600" />
                <Eye className="h-3 w-3 text-rose-500 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-rose-900">{data.assignmentsCreatedToday}</div>
              <p className="text-xs text-rose-700 mt-1">Created today</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('teacher', 'Feedback Given')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-teal-900">Feedback Given</CardTitle>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-teal-600" />
                <Eye className="h-3 w-3 text-teal-500 opacity-60" />
              </div>
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
          <Card 
            className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('performance', 'Error Rate')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-red-900">Error Rate</CardTitle>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <Eye className="h-3 w-3 text-red-500 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-900">{data.errorRate}%</div>
              <p className="text-xs text-red-700 mt-1">System errors</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick('performance', 'Avg Load Time')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-gray-900">Avg Load Time</CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <Eye className="h-3 w-3 text-gray-500 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{data.averageLoadTime}ms</div>
              <p className="text-xs text-gray-700 mt-1">Page load performance</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTitle}</DialogTitle>
            <DialogDescription>
              Detailed breakdown of {detailTitle.toLowerCase()} for today
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : detailData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data available for this metric today.
            </div>
          ) : (
            <div className="mt-4">
              {detailType === 'logins' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Logout Time</TableHead>
                      <TableHead>Session Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData as LoginDetail[]).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.user_name}</TableCell>
                        <TableCell>
                          <Badge variant={item.user_role === 'student' ? 'default' : 'secondary'}>
                            {item.user_role}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(item.login_time).toLocaleString()}</TableCell>
                        <TableCell>{item.logout_time ? new Date(item.logout_time).toLocaleString() : 'Active'}</TableCell>
                        <TableCell>{item.session_duration || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {detailType === 'engagement' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Content Type</TableHead>
                      <TableHead>Content ID</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData as ContentInteractionDetail[]).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.content_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.content_id}</TableCell>
                        <TableCell>{item.action}</TableCell>
                        <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{item.duration || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {detailType === 'teacher' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Content ID</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData as TeacherActivityDetail[]).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.teacher_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.action.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.content_id}</TableCell>
                        <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {detailType === 'performance' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailData as SystemPerformanceDetail[]).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={item.event_type === 'error' ? 'destructive' : 'default'}>
                            {item.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <pre className="text-xs whitespace-pre-wrap">
                            {typeof item.details === 'object' ? JSON.stringify(item.details, null, 2) : item.details}
                          </pre>
                        </TableCell>
                        <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

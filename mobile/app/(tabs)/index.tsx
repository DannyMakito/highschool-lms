import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useSubjects } from "../../src/hooks/useSubjects";
import { useRegistrationData } from "../../src/hooks/useRegistrationData";
import { useAssignments } from "../../src/hooks/useAssignments";
import { useAnnouncements } from "../../src/hooks/useAnnouncements";
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { BookOpen, FileText, CheckCircle, Play, Clock, ArrowRight, Megaphone, Layout, ChevronLeft, ChevronRight } from "lucide-react-native";
import { 
    Calendar,
    CalendarHeader,
    CalendarHeaderPrevButton,
    CalendarHeaderTitle,
    CalendarHeaderNextButton,
    CalendarWeekDaysHeader,
    CalendarBody,
    CalendarGrid,
    CalendarWeek,
    CalendarDay,
    CalendarDayText
} from '@/components/ui/calendar';
import { CircularProgress } from '@/components/ui/circular-progress';

// Helper for Tailwind-like joining if needed, but we'll try to stick to inline styles for complex colors 
// since React Native CSS might be buggy with gradients right now.
// We'll use static colors matching the web app.
const colors = {
    bgApp: '#ffffff', // Assuming white background for web app's layout
    textDark: '#1e293b',
    textMuted: '#94a3b8',
    cardBg: '#ffffff',
    indigo500: '#6366f1',
    indigo600: '#4f46e5',
    orange400: '#fbbf24',
    pink400: '#f472b6',
    green400: '#4ade80',
    slate50: '#f8fafc',
    slate100: '#f1f5f9',
    slate200: '#e2e8f0',
};

export default function DashboardScreen() {
    const router = useRouter();
    const { user } = useAuth();
    
    const {
        subjects: allSubjects,
        lessons,
        quizzes,
        submissions: quizSubmissions,
        getSubjectProgress,
        getSubjectLessonsCount,
        getSubjectCompletedLessonsCount,
        lastLesson
    } = useSubjects();

    const { studentSubjects, studentSubjectClasses, subjectClasses } = useRegistrationData();
    const { assignments: allAssignments, submissions: assignmentSubmissions } = useAssignments();
    const { announcements } = useAnnouncements();

    const [date, setDate] = useState<Date | undefined>(new Date());

    // Filtered subjects for this student
    const subjects = useMemo(() => {
        const directAssignedIds = studentSubjects
            .filter(ss => ss.studentId === user?.id)
            .map(ss => ss.subjectId);
            
        const classAssignedIds = studentSubjectClasses
            .filter(ssc => ssc.studentId === user?.id)
            .map(ssc => {
                const sc = subjectClasses.find(c => c.id === ssc.subjectClassId);
                return sc?.subjectId;
            })
            .filter(Boolean) as string[];

        const assignedIds = Array.from(new Set([...directAssignedIds, ...classAssignedIds]));
        return allSubjects.filter(s => assignedIds.includes(s.id));
    }, [allSubjects, studentSubjects, studentSubjectClasses, subjectClasses, user?.id]);

    // Derive last lesson data
    const lastViewed = useMemo(() => {
        if (lastLesson) {
            const subject = subjects.find(s => s.id === lastLesson.subjectId);
            const lesson = lessons?.find(l => l.id === lastLesson.lessonId);
            if (subject) {
                return {
                    subject,
                    lesson,
                    progress: getSubjectProgress(subject.id),
                    total: getSubjectLessonsCount(subject.id),
                    done: getSubjectCompletedLessonsCount(subject.id)
                };
            }
        }
        if (subjects.length > 0) {
            const subject = subjects[0];
            return {
                subject,
                lesson: null,
                progress: getSubjectProgress(subject.id),
                total: getSubjectLessonsCount(subject.id),
                done: getSubjectCompletedLessonsCount(subject.id)
            };
        }
        return null;
    }, [lastLesson, subjects, lessons, getSubjectProgress, getSubjectLessonsCount, getSubjectCompletedLessonsCount]);

    // Assignments stats
    const assignments = useMemo(() => {
        const subjectIds = subjects.map(s => s.id);
        return allAssignments.filter(a => subjectIds.includes(a.subjectId));
    }, [allAssignments, subjects]);

    const totalAssignments = assignments.length;
    const assignmentDoneAll = assignmentSubmissions.filter(s => s.studentId === user?.id).length;
    const assignmentProgress = totalAssignments > 0 ? Math.round((assignmentDoneAll / totalAssignments) * 100) : 0;

    const totalTests = quizzes.filter(q => q.status === 'published').length;
    const testDoneAll = quizSubmissions.filter(s => s.studentId === user?.id).length;
    const testProgress = totalTests > 0 ? Math.round((testDoneAll / totalTests) * 100) : 0;

    const totalLessonsAll = subjects.reduce((acc, s) => acc + getSubjectLessonsCount(s.id), 0);
    const totalDoneAll = subjects.reduce((acc, s) => acc + getSubjectCompletedLessonsCount(s.id), 0);
    const overallProgress = totalLessonsAll > 0 ? Math.round((totalDoneAll / totalLessonsAll) * 100) : 0;

    const upcomingItems = useMemo(() => {
        const items = [
            ...assignments.map(a => ({ id: a.id, title: a.title, type: 'Assignment', date: a.dueDate, color: colors.pink400, bg: '#fce7f3' })),
            ...quizzes.filter(q => q.status === 'published').map(q => ({ id: q.id, title: q.title, type: 'Quiz', date: q.createdAt, color: colors.green400, bg: '#dcfce7' }))
        ];
        return items.filter(item => {
            if (!item.date) return false;
            const d = new Date(item.date);
            return !isNaN(d.getTime());
        }).slice(0, 4);
    }, [assignments, quizzes]);

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.bgApp, paddingHorizontal: 16 }} contentContainerStyle={{ paddingVertical: 24, gap: 24 }}>
            {/* Top Banner - Resume Last Lesson */}
            {lastViewed && (
                <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, shadowColor: '#4f46e5', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ height: 48, width: 48, borderRadius: 16, backgroundColor: colors.indigo500, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                            <Play color="#fff" size={24} style={{ marginLeft: 4 }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textDark, marginBottom: 8 }}>
                                {lastViewed.lesson ? `Resume: ${lastViewed.lesson.title}` : `Continue: ${lastViewed.subject.name}`}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ flex: 1, maxWidth: 120 }}>
                                    <Progress value={lastViewed.progress} style={{ height: 6, backgroundColor: colors.slate100, borderRadius: 3 }}>
                                        <ProgressFilledTrack style={{ backgroundColor: colors.indigo500, borderRadius: 3 }} />
                                    </Progress>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.slate100 }}>
                                        <Layout color={colors.indigo500} size={10} style={{ marginRight: 4 }} />
                                        <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted }}>{lastViewed.subject.name}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.slate100 }}>
                                        <CheckCircle color={colors.green400} size={10} style={{ marginRight: 4 }} />
                                        <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted }}>{lastViewed.done}/{lastViewed.total}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={{ backgroundColor: colors.indigo600, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                        onPress={() => {
                            if (lastViewed.lesson) {
                                router.push(`/subjects/${lastViewed.subject.id}/lessons/${lastViewed.lesson.id}` as any);
                            } else {
                                router.push(`/subjects/${lastViewed.subject.id}/outline` as any);
                            }
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Start Learning</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Overview Section */}
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textDark, marginRight: 8 }}>Overview</Text>
                    <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: colors.indigo500 }} />
                </View>
                
                <View style={{ gap: 16 }}>
                    {/* Lessons Card */}
                    <View style={{ backgroundColor: '#fffdfa', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ffedd5' }}>
                        <View>
                            <View style={{ height: 48, width: 48, borderRadius: 16, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <BookOpen color={colors.orange400} size={24} />
                            </View>
                            <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textDark }}>{totalDoneAll}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>Lessons</Text>
                        </View>
                        <CircularProgress value={overallProgress} colorClass="text-orange-400" />
                    </View>

                    {/* Assignments Card */}
                    <View style={{ backgroundColor: '#fffafa', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#fce7f3' }}>
                        <View>
                            <View style={{ height: 48, width: 48, borderRadius: 16, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <FileText color={colors.pink400} size={24} />
                            </View>
                            <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textDark }}>{assignmentDoneAll}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>Files</Text>
                        </View>
                        <CircularProgress value={assignmentProgress} colorClass="text-pink-400" />
                    </View>

                    {/* Tests Card */}
                    <View style={{ backgroundColor: '#f0fff4', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#dcfce7' }}>
                        <View>
                            <View style={{ height: 48, width: 48, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <CheckCircle color={colors.green400} size={24} />
                            </View>
                            <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textDark }}>{testDoneAll}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>Tests</Text>
                        </View>
                        <CircularProgress value={testProgress} colorClass="text-green-400" />
                    </View>
                </View>
            </View>

            {/* My Subjects */}
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textDark, marginRight: 8 }}>My Subjects</Text>
                        <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: colors.indigo500 }} />
                    </View>
                    <TouchableOpacity onPress={() => router.push('/subjects')}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.indigo600, textTransform: 'uppercase' }}>View All</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ gap: 12 }}>
                    {subjects.slice(0, 4).map((subject, idx) => {
                        const progress = getSubjectProgress(subject.id);
                        const total = getSubjectLessonsCount(subject.id);
                        const done = getSubjectCompletedLessonsCount(subject.id);
                        const subjectColors = [colors.indigo500, colors.orange400, '#f59e0b', colors.green400];
                        const iconColor = subjectColors[idx % subjectColors.length];

                        return (
                            <TouchableOpacity
                                key={subject.id}
                                style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
                                onPress={() => router.push(`/subjects/${subject.id}/outline` as any)}
                            >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.slate200, marginRight: 12 }}>0{idx + 1}</Text>
                                <View style={{ height: 44, width: 44, borderRadius: 12, backgroundColor: iconColor, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{subject.name[0]}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textDark, marginBottom: 2 }}>{subject.name}</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>{(subject as any).code || 'SUB-101'}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.slate50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 }}>
                                        <Clock color={colors.textMuted} size={12} style={{ marginRight: 4 }} />
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{done}/{total}</Text>
                                    </View>
                                    <View style={{ width: 60 }}>
                                        <Progress value={progress} style={{ height: 4, backgroundColor: colors.slate100, borderRadius: 2 }}>
                                            <ProgressFilledTrack style={{ backgroundColor: colors.indigo500, borderRadius: 2 }} />
                                        </Progress>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    {subjects.length === 0 && (
                        <View style={{ padding: 40, alignItems: 'center', backgroundColor: colors.slate50, borderRadius: 20, borderWidth: 2, borderColor: colors.slate200, borderStyle: 'dashed' }}>
                            <BookOpen color={colors.slate200} size={48} style={{ marginBottom: 16 }} />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>No subjects enrolled yet</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Calendar & Upcoming */}
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textDark, marginRight: 8 }}>Calendar</Text>
                    <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: colors.indigo500 }} />
                </View>
                
                <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 24 }}>
                    <Calendar value={date} onValueChange={setDate}>
                        <CalendarHeader style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 8, paddingTop: 8 }}>
                            <CalendarHeaderPrevButton>
                                <ChevronLeft size={20} color={colors.textDark} />
                            </CalendarHeaderPrevButton>
                            <CalendarHeaderTitle style={{ fontSize: 16, fontWeight: '700', color: colors.textDark }} />
                            <CalendarHeaderNextButton>
                                <ChevronRight size={20} color={colors.textDark} />
                            </CalendarHeaderNextButton>
                        </CalendarHeader>
                        <CalendarWeekDaysHeader style={{ borderBottomWidth: 1, borderBottomColor: colors.slate100, paddingBottom: 8, marginBottom: 8 }} />
                        <CalendarBody>
                            <CalendarGrid />
                        </CalendarBody>
                    </Calendar>
                </View>

                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textDark, marginBottom: 16 }}>Upcoming</Text>
                <View style={{ gap: 16 }}>
                    {upcomingItems.map((item, idx) => {
                        const d = new Date(item.date);
                        return (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ height: 56, width: 56, borderRadius: 16, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderTopWidth: 4, borderTopColor: colors.indigo500 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textDark }}>{d.getDate()}</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>{d.toLocaleString('default', { month: 'short' })}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textDark, marginBottom: 4 }}>{item.title}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ backgroundColor: item.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '800', color: item.color, textTransform: 'uppercase' }}>{item.type}</Text>
                                        </View>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.slate200 }}>10:00 AM</Text>
                                    </View>
                                </View>
                                <View style={{ height: 32, width: 32, borderRadius: 16, backgroundColor: colors.slate50, alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowRight color={colors.textMuted} size={16} />
                                </View>
                            </View>
                        );
                    })}
                    {upcomingItems.length === 0 && (
                        <View style={{ padding: 40, alignItems: 'center', backgroundColor: colors.slate50, borderRadius: 20, borderWidth: 2, borderColor: colors.slate200, borderStyle: 'dashed' }}>
                            <Clock color={colors.slate200} size={32} style={{ marginBottom: 12 }} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>No activities scheduled</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Announcements */}
            {announcements.length > 0 && (
                <View style={{ backgroundColor: '#0f172a', borderRadius: 24, padding: 24, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Megaphone color="#818cf8" size={20} />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', fontStyle: 'italic' }}>School Alerts</Text>
                    </View>
                    <View style={{ gap: 16 }}>
                        {announcements.slice(0, 1).map(a => (
                            <View key={a.id}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff', marginBottom: 8 }} numberOfLines={1}>{a.title}</Text>
                                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: 12 }} numberOfLines={3}>"{a.content || (a as any).body}"</Text>
                                <TouchableOpacity onPress={() => router.push('/announcements')}>
                                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#818cf8', textTransform: 'uppercase' }}>Read More</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

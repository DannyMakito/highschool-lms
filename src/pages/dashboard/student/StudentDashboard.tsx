import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
    BookOpen,
    FileText,
    CheckCircle,
    Play,
    Clock,
    ChevronLeft,
    ChevronRight,
    Megaphone,
    Layout,
    ArrowRight
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { cn } from "@/lib/utils";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

// Circular Progress Component
const CircularProgress = ({ value, colorClass }: { value: number; colorClass: string }) => {
    // Extract hex color from class if possible, or use a map
    const colorMap: Record<string, string> = {
        'text-orange-400': '#fbbf24',
        'text-pink-400': '#f472b6',
        'text-green-400': '#4ade80',
    };

    const color = colorMap[colorClass] || '#6366f1';

    return (
        <div className="w-12 h-12 flex items-center justify-center relative">
            <CircularProgressbar
                value={value}
                text={`${value}%`}
                strokeWidth={10}
                styles={buildStyles({
                    pathColor: color,
                    textColor: '#1e293b', // slate-800
                    textSize: '24px',
                    trailColor: 'rgba(0,0,0,0.05)',
                    strokeLinecap: 'round',
                })}
            />
        </div>
    );
};

export default function StudentDashboard() {
    const navigate = useNavigate();
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

    // Filtered subjects for this student
    const subjects = React.useMemo(() => {
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

    const { assignments: allAssignments, submissions: assignmentSubmissions } = useAssignments();
    const { announcements } = useAnnouncements();
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    // Derive last lesson data
    const lastViewed = React.useMemo(() => {
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
        // Fallback to first subject
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
    const assignments = React.useMemo(() => {
        const subjectIds = subjects.map(s => s.id);
        return allAssignments.filter(a => subjectIds.includes(a.subjectId));
    }, [allAssignments, subjects]);

    const totalAssignments = assignments.length;
    const assignmentDoneAll = assignmentSubmissions.filter(s => s.studentId === user?.id).length;
    const assignmentProgress = totalAssignments > 0 ? Math.round((assignmentDoneAll / totalAssignments) * 100) : 0;

    // Tests (Quizzes) stats
    const totalTests = quizzes.filter(q => q.status === 'published').length;
    const testDoneAll = quizSubmissions.filter(s => s.studentId === user?.id).length;
    const testProgress = totalTests > 0 ? Math.round((testDoneAll / totalTests) * 100) : 0;

    // Overall Lesson progress
    const totalLessonsAll = subjects.reduce((acc, s) => acc + getSubjectLessonsCount(s.id), 0);
    const totalDoneAll = subjects.reduce((acc, s) => acc + getSubjectCompletedLessonsCount(s.id), 0);
    const overallProgress = totalLessonsAll > 0 ? Math.round((totalDoneAll / totalLessonsAll) * 100) : 0;

    // Combine upcoming items
    const upcomingItems = React.useMemo(() => {
        const items = [
            ...assignments.map(a => ({ id: a.id, title: a.title, type: 'Assignment', date: a.dueDate, color: 'text-pink-500', bg: 'bg-pink-100' })),
            ...quizzes.filter(q => q.status === 'published').map(q => ({ id: q.id, title: q.title, type: 'Quiz', date: q.createdAt, color: 'text-green-500', bg: 'bg-green-100' }))
        ];
        // Sort by date (mocking a bit since createdAt might be old)
        return items.slice(0, 4);
    }, [assignments, quizzes]);

    return (
        <div className="flex flex-col gap-6 p-1 md:p-2 lg:p-4 animate-in fade-in duration-700">
            {/* Top Banner - Resume Last Lesson */}
            {lastViewed && (
                <Card className="border-none shadow-xl shadow-indigo-100/20 overflow-hidden bg-white/60 backdrop-blur-xl group hover:shadow-2xl hover:shadow-indigo-100/40 transition-all duration-500">
                    <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5 flex-1">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-500">
                                <Play className="h-6 w-6 fill-current ml-1" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">
                                    {lastViewed.lesson ? `Resume: ${lastViewed.lesson.title}` : `Continue: ${lastViewed.subject.name}`}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 max-w-[240px]">
                                        <Progress value={lastViewed.progress} className="h-1.5 bg-slate-100/50 [&>div]:bg-indigo-500 rounded-full" />
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100"><Layout className="h-3 w-3 text-indigo-500" /> {lastViewed.subject.name}</span>
                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100"><CheckCircle className="h-3 w-3 text-emerald-500" /> {lastViewed.done}/{lastViewed.total} Modules</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            className="rounded-2xl bg-indigo-600 text-white hover:bg-black font-black uppercase tracking-widest text-[10px] gap-2 h-12 px-8 shadow-lg shadow-indigo-100 transition-all"
                            onClick={() => {
                                if (lastViewed.lesson) {
                                    navigate(`/student/subjects/${lastViewed.subject.id}/lessons/${lastViewed.lesson.id}`);
                                } else {
                                    navigate(`/student/subjects/${lastViewed.subject.id}/outline`);
                                }
                            }}
                        >
                            Start Learning
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Section */}
                <div className="lg:col-span-8 space-y-10">
                    {/* Status Section */}
                    <section className="space-y-6">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            Overview
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Lessons Card */}
                            <Card className="border-none shadow-sm bg-gradient-to-br from-[#fffdfa] to-[#fff9f0] hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-orange-400/5 blur-3xl rounded-full" />
                                <CardContent className="p-6 flex items-center justify-between relative z-10">
                                    <div className="space-y-3">
                                        <div className="h-12 w-12 rounded-2xl bg-orange-400/10 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-0.5 mt-2">
                                            <p className="text-4xl font-black text-slate-900 leading-none">{totalDoneAll}</p>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Lessons</p>
                                        </div>
                                    </div>
                                    <CircularProgress value={overallProgress} colorClass="text-orange-400" />
                                </CardContent>
                            </Card>

                            {/* Assignments Card */}
                            <Card className="border-none shadow-sm bg-gradient-to-br from-[#fffafa] to-[#fff0f4] hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-pink-400/5 blur-3xl rounded-full" />
                                <CardContent className="p-6 flex items-center justify-between relative z-10">
                                    <div className="space-y-3">
                                        <div className="h-12 w-12 rounded-2xl bg-pink-400/10 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-0.5 mt-2">
                                            <p className="text-4xl font-black text-slate-900 leading-none">{assignmentDoneAll}</p>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Files</p>
                                        </div>
                                    </div>
                                    <CircularProgress value={assignmentProgress} colorClass="text-pink-400" />
                                </CardContent>
                            </Card>

                            {/* Tests Card */}
                            <Card className="border-none shadow-sm bg-gradient-to-br from-[#fafbff] to-[#f0fff4] hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-green-400/5 blur-3xl rounded-full" />
                                <CardContent className="p-6 flex items-center justify-between relative z-10">
                                    <div className="space-y-3">
                                        <div className="h-12 w-12 rounded-2xl bg-green-400/10 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-0.5 mt-2">
                                            <p className="text-4xl font-black text-slate-900 leading-none">{testDoneAll}</p>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Tests</p>
                                        </div>
                                    </div>
                                    <CircularProgress value={testProgress} colorClass="text-green-400" />
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* My Courses Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                My Subjects
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => navigate("/student/subjects")} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50">View All</Button>
                        </div>

                        <div className="space-y-3">
                            {subjects.slice(0, 4).map((subject, idx) => {
                                const progress = getSubjectProgress(subject.id);
                                const total = getSubjectLessonsCount(subject.id);
                                const done = getSubjectCompletedLessonsCount(subject.id);
                                const colors = [
                                    "from-indigo-500 to-purple-500 text-white shadow-indigo-100",
                                    "from-orange-400 to-red-400 text-white shadow-orange-100",
                                    "from-amber-400 to-orange-500 text-white shadow-amber-100",
                                    "from-emerald-400 to-green-500 text-white shadow-emerald-100"
                                ];

                                return (
                                    <Card
                                        key={subject.id}
                                        className="border-none shadow-none bg-white/40 backdrop-blur-md hover:bg-white hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden p-1"
                                        onClick={() => navigate(`/student/subjects/${subject.id}/outline`)}
                                    >
                                        <CardContent className="grid grid-cols-12 items-center p-4 gap-6">
                                            <div className="col-span-1 text-slate-300 text-[10px] font-black uppercase italic">0{idx + 1}</div>
                                            <div className="col-span-6 md:col-span-5 flex items-center gap-4">
                                                <div className={cn("h-11 w-11 rounded-2xl bg-gradient-to-br shrink-0 flex items-center justify-center font-black text-lg shadow-lg", colors[idx % colors.length])}>
                                                    {subject.name[0]}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors truncate block">{subject.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subject.code || 'SUB-101'}</span>
                                                </div>
                                            </div>
                                            <div className="hidden md:block col-span-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center px-0.5">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase">Progress</span>
                                                        <span className="text-[8px] font-black text-indigo-600">{progress}%</span>
                                                    </div>
                                                    <Progress value={progress} className="h-1 bg-slate-100/50 [&>div]:bg-indigo-500 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="col-span-5 md:col-span-3 flex items-center justify-between pl-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg text-slate-500 text-[10px] font-bold border border-slate-100">
                                                        <Clock className="h-3 w-3" /> {done}/{total}
                                                    </div>
                                                </div>
                                                <div className="h-10 w-10 rounded-xl bg-slate-100/50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {subjects.length === 0 && (
                                <div className="py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No subjects enrolled yet</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar Section */}
                <div className="lg:col-span-4 space-y-10">
                    <section className="space-y-6">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            Calendar
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        </h3>
                        <Card className="border-none shadow-xl shadow-slate-100/50 bg-white p-2 rounded-3xl">
                            <CardContent className="p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-2xl border-none p-3 w-full"
                                />
                            </CardContent>
                        </Card>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Upcoming</h3>
                        </div>
                        <div className="space-y-5">
                            {upcomingItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-5 group cursor-pointer hover:translate-x-2 transition-transform duration-300">
                                    <div className="h-14 w-14 rounded-2xl bg-white shadow-lg shadow-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-50 relative overflow-hidden">
                                        <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500 opacity-60" />
                                        <span className="text-xs font-black text-slate-800 leading-none">{new Date(item.date).getDate()}</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none mt-1.5">{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-black text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">{item.title}</p>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest", item.bg, item.color)}>
                                                {item.type}
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase">10:00 AM</span>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {upcomingItems.length === 0 && (
                                <div className="py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                                    <Clock className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No activities scheduled</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Announcement Sidebar Card */}
                    {announcements.length > 0 && (
                        <Card className="bg-slate-900 border-none shadow-2xl text-white overflow-hidden relative group p-6 rounded-3xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/30 transition-colors" />
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <Megaphone className="h-5 w-5 text-indigo-400" />
                                </div>
                                <h4 className="font-black italic text-lg">School Alerts</h4>
                            </div>
                            <div className="space-y-4 relative z-10">
                                {announcements.slice(0, 1).map(a => (
                                    <div key={a.id} className="space-y-2">
                                        <h5 className="font-black text-sm text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{a.title}</h5>
                                        <p className="text-xs text-white/50 leading-relaxed line-clamp-3 italic">"{a.content}"</p>
                                        <Button variant="link" className="text-indigo-400 p-0 h-auto font-black uppercase text-[10px] tracking-widest mt-2 hover:text-white" onClick={() => navigate("/student/announcements")}>
                                            Read More
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

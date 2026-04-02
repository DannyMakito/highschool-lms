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
    Layout
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

    return (
        <div className="flex flex-col gap-6 p-1 md:p-2 lg:p-4 animate-in fade-in duration-500">
            {/* Top Banner - Resume Last Lesson */}
            {lastViewed && (
                <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                    <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h2 className="text-sm font-semibold text-slate-800">
                                    {lastViewed.lesson ? `Resume: ${lastViewed.lesson.title}` : `Continue: ${lastViewed.subject.name}`}
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 max-w-[200px]">
                                        <Progress value={lastViewed.progress} className="h-1 bg-indigo-100 [&>div]:bg-indigo-500" />
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                                        <span className="flex items-center gap-1" title="Subject"><Layout className="h-3 w-3" /> {lastViewed.subject.name}</span>
                                        <span className="flex items-center gap-1" title="Lessons Done"><CheckCircle className="h-3 w-3" /> {lastViewed.done}/{lastViewed.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="rounded-full bg-indigo-50 border-none text-indigo-600 hover:bg-indigo-100 font-semibold gap-2 h-10 px-6"
                            onClick={() => {
                                if (lastViewed.lesson) {
                                    navigate(`/student/subjects/${lastViewed.subject.id}/lessons/${lastViewed.lesson.id}`);
                                } else {
                                    navigate(`/student/subjects/${lastViewed.subject.id}/outline`);
                                }
                            }}
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Resume
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Section */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Status Section */}
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800">Status</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Lessons Card */}
                            <Card className="border-none shadow-none bg-[#fff9f0] hover:scale-[1.02] transition-transform duration-300">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-10 w-10 rounded-xl bg-orange-400/20 flex items-center justify-center text-orange-600">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-0.5 mt-2">
                                            <p className="text-3xl font-black text-slate-800">{totalDoneAll.toString().padStart(2, '0')}</p>
                                            <p className="text-sm font-bold text-slate-700">Lessons</p>
                                            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">of {totalLessonsAll} completed</p>
                                        </div>
                                    </div>
                                    <CircularProgress value={overallProgress} colorClass="text-orange-400" />
                                </CardContent>
                            </Card>

                            {/* Assignments Card */}
                            <Card className="border-none shadow-none bg-[#fff0f4] hover:scale-[1.02] transition-transform duration-300">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-10 w-10 rounded-xl bg-pink-400/20 flex items-center justify-center text-pink-600">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-0.5 mt-2">
                                            <p className="text-3xl font-black text-slate-800">{assignmentDoneAll.toString().padStart(2, '0')}</p>
                                            <p className="text-sm font-bold text-slate-700">Assignments</p>
                                            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">of {totalAssignments} completed</p>
                                        </div>
                                    </div>
                                    <CircularProgress value={assignmentProgress} colorClass="text-pink-400" />
                                </CardContent>
                            </Card>

                            {/* Tests Card */}
                            <Card className="border-none shadow-none bg-[#f0fff4] hover:scale-[1.02] transition-transform duration-300">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-10 w-10 rounded-xl bg-green-400/20 flex items-center justify-center text-green-600">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-0.5 mt-2">
                                            <p className="text-3xl font-black text-slate-800">{testDoneAll.toString().padStart(2, '0')}</p>
                                            <p className="text-sm font-bold text-slate-700">Tests</p>
                                            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">of {totalTests} completed</p>
                                        </div>
                                    </div>
                                    <CircularProgress value={testProgress} colorClass="text-green-400" />
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* My Courses Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">My subjects</h3>
                            <div className="flex items-center gap-4">
                                <Tabs defaultValue="active" className="w-[180px]">
                                    <TabsList className="grid w-full grid-cols-2 bg-slate-100/50 p-1 rounded-full h-8">
                                        <TabsTrigger value="active" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-[10px] font-black">Active</TabsTrigger>
                                        <TabsTrigger value="completed" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-[10px] font-black">Done</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Button variant="link" onClick={() => navigate("/student/subjects")} className="text-xs font-bold text-indigo-600">View All</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {/* Course List Header */}
                            <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <div className="col-span-1">#</div>
                                <div className="col-span-6 md:col-span-5">Subject Name</div>
                                <div className="hidden md:block col-span-3">Progress</div>
                                <div className="col-span-5 md:col-span-3">Status</div>
                            </div>

                            {subjects.slice(0, 4).map((subject, idx) => {
                                const progress = getSubjectProgress(subject.id);
                                const total = getSubjectLessonsCount(subject.id);
                                const done = getSubjectCompletedLessonsCount(subject.id);
                                const colors = [
                                    "from-indigo-500 to-purple-500",
                                    "from-orange-400 to-red-400",
                                    "from-yellow-400 to-red-500",
                                    "from-green-400 to-emerald-500"
                                ];

                                return (
                                    <Card
                                        key={subject.id}
                                        className="border-none shadow-none hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                        onClick={() => navigate(`/student/subjects/${subject.id}/outline`)}
                                    >
                                        <CardContent className="grid grid-cols-12 items-center p-4 gap-4">
                                            <div className="col-span-1 text-slate-400 text-sm font-medium">0{idx + 1}</div>
                                            <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                                                <div className={cn("h-9 w-9 rounded-lg bg-gradient-to-br shrink-0", colors[idx % colors.length])} />
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">{subject.name}</span>
                                            </div>
                                            <div className="hidden md:block col-span-3">
                                                <div className="flex flex-col gap-1.5 pt-1">
                                                    <Progress value={progress} className="h-1.5 bg-slate-100 [&>div]:bg-indigo-500" />
                                                </div>
                                            </div>
                                            <div className="col-span-5 md:col-span-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                                                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {done}/{total}</span>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600 group-hover:scale-110 transition-transform">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {subjects.length === 0 && (
                                <div className="py-12 text-center text-sm text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed">
                                    No subjects enrolled yet.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Announcements Section */}
                    {announcements.length > 0 && (
                        <section className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800">School News</h3>
                                <Button variant="link" onClick={() => navigate("/student/announcements")} className="text-xs font-bold text-indigo-600">View All</Button>
                            </div>
                            <div className="grid gap-4">
                                {announcements.slice(0, 2).map((a) => (
                                    <Card key={a.id} className="border-none shadow-sm bg-white group cursor-pointer" onClick={() => navigate("/student/announcements")}>
                                        <CardContent className="p-4 flex gap-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                                <Megaphone className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div className="space-y-1 overflow-hidden text-left">
                                                <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors uppercase text-[10px] tracking-wider">{a.title}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">{a.content}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar Section */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Calendar Status */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">Status</h3>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full"><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <Card className="border-none shadow-none bg-white">
                            <CardContent className="p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-xl border-none p-2 w-full"
                                />
                            </CardContent>
                        </Card>
                    </section>

                    {/* Upcoming Section */}
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800">Upcoming</h3>
                        <div className="space-y-4">
                            {[
                                { title: "Practical theory", type: "Assignments", color: "bg-pink-100 text-pink-500" },
                                { title: "Practical theory 1", type: "Test", color: "bg-green-100 text-green-500" },
                                { title: "Practical theory 2", type: "Lessons", color: "bg-orange-100 text-orange-500" },
                                { title: "Practical theory 3", type: "Assignments", color: "bg-pink-100 text-pink-500" },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 leading-none">29</span>
                                        <span className="text-[8px] font-black text-slate-300 uppercase leading-none mt-0.5">Sept</span>
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <p className="text-sm font-bold text-slate-700">{item.title}</p>
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn("h-1.5 w-1.5 rounded-full", item.color.split(' ')[1].replace('text-', 'bg-'))} />
                                            <span className={cn("text-[10px] font-bold", item.color.split(' ')[1])}>{item.type}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

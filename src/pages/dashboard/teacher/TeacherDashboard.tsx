import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BookOpen,
    Layers,
    Video,
    Plus,
    ArrowRight,
    Activity,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export default function TeacherDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { teachers } = useSchoolData();
    const { subjects: allSubjects } = useSubjects();

    const subjects = useMemo(() => {
        const teacherProfile = teachers.find(t => t.id === user?.id);
        if (!teacherProfile) return [];
        return allSubjects.filter(s => teacherProfile.subjects.includes(s.id));
    }, [allSubjects, teachers, user?.id]);

    const stats = [
        { title: "My Subjects", value: subjects.length, icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10", trend: "+2 this term" },
        { title: "Topics", value: subjects.reduce((acc, s) => acc + s.modulesCount, 0), icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10", trend: "Fully mapped" },
        { title: "Active Lessons", value: subjects.reduce((acc, s) => acc + s.lessonsCount, 0), icon: Video, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "12 new recently" },
        { title: "Assigned Grades", value: "8-12", icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10", trend: "High performance" },
    ];

    const quickActions = [
        { title: "Academic Overview", desc: "View and edit subjects", icon: BookOpen, path: "/teacher/subjects", accent: "indigo" },
        { title: "Course Architect", desc: "Organize Subject topic", icon: Layers, path: "/teacher/subjects", accent: "blue" },
        { title: "Lesson Studio", desc: "Edit lesson content", icon: Video, path: "/teacher/subjects", accent: "emerald" },
    ];

    return (
        <div className="space-y-10 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent italic">Instructor Portal</h1>
                    <p className="text-muted-foreground font-medium">Empowering educators with real-time academic control.</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100/50">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Active Session</span>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="bg-white/40 backdrop-blur-xl border-white/20 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${stat.bg} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">{stat.title}</CardTitle>
                            <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-3xl font-black text-slate-900 leading-none mb-1">{stat.value}</div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.trend}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-5">
                {/* Quick Actions */}
                <div className="lg:col-span-3 space-y-6">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Plus className="h-5 w-5 text-indigo-500" />
                        Quick Access
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-1">
                        {quickActions.map((action) => (
                            <div
                                key={action.title}
                                onClick={() => navigate(action.path)}
                                className="flex items-center justify-between p-5 rounded-[2rem] border border-white bg-white/40 backdrop-blur-xl hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "p-4 rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110",
                                        action.accent === 'indigo' ? "bg-indigo-500 text-white shadow-indigo-100" :
                                        action.accent === 'blue' ? "bg-blue-500 text-white shadow-blue-100" :
                                        "bg-emerald-500 text-white shadow-emerald-100"
                                    )}>
                                        <action.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase italic">{action.title}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{action.desc}</p>
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-45">
                                    <ArrowRight className="h-5 w-5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Health */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                        Engagement
                    </h2>
                    <Card className="bg-slate-900 border-none shadow-2xl text-white overflow-hidden relative group p-8 rounded-[2.5rem]">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/30 transition-colors" />
                        <div className="space-y-8 relative z-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Content Readiness</p>
                                    <p className="text-2xl font-black text-indigo-400 italic">92%</p>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[92%] rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 divide-y divide-white/5">
                                <div className="flex items-center gap-4 py-4 first:pt-0">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Subject Profiles</p>
                                        <p className="text-[10px] opacity-60">100% Certified Complete</p>
                                    </div>
                                    <span className="text-sm font-black">{subjects.length}/10</span>
                                </div>
                                <div className="flex items-center gap-4 py-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Layers className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Module Mapping</p>
                                        <p className="text-[10px] opacity-60">Optimized for Term 2</p>
                                    </div>
                                    <span className="text-sm font-black text-indigo-400">Online</span>
                                </div>
                                <div className="flex items-center gap-4 py-4 last:pb-0 opacity-50">
                                    <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Quiz Updates</p>
                                        <p className="text-[10px] opacity-60">Grade 12 final review</p>
                                    </div>
                                    <span className="text-sm font-black">Pending</span>
                                </div>
                            </div>

                            <Button className="w-full h-14 bg-indigo-600 hover:bg-white hover:text-indigo-600 font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-500/20">
                                Generate Audit Report
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

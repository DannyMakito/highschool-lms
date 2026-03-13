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
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useMemo } from "react";

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
        { title: "Subjects", value: subjects.length, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
        { title: "Topic", value: subjects.reduce((acc, s) => acc + s.modulesCount, 0), icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Lessons", value: subjects.reduce((acc, s) => acc + s.lessonsCount, 0), icon: Video, color: "text-green-500", bg: "bg-green-500/10" },
        { title: "Active Grade", value: "8-12", icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
    ];

    const quickActions = [
        { title: "Manage Subjects", desc: "View and edit subjects", icon: BookOpen, path: "/teacher/subjects" },
        { title: "Manage Subject", desc: "Organize Subject topic", icon: Layers, path: "/teacher/subjects" },
        { title: "Manage Lessons", desc: "Edit lesson content", icon: Video, path: "/teacher/subjects" },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight">Teacher Dashboard</h1>
                <p className="text-muted-foreground">Manage your subjects, modules, and lessons from one place.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="bg-card/40 backdrop-blur-md border-muted/20 hover:border-primary/30 transition-all cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                            <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Quick Actions
                    </h2>
                    <div className="space-y-3">
                        {quickActions.map((action) => (
                            <div
                                key={action.title}
                                onClick={() => navigate(action.path)}
                                className="flex items-center justify-between p-4 rounded-xl border bg-card/40 backdrop-blur-sm hover:bg-accent/50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-lg bg-background border group-hover:border-primary/50 transition-colors">
                                        <action.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{action.title}</h3>
                                        <p className="text-sm text-muted-foreground">{action.desc}</p>
                                    </div>
                                </div>
                                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Health */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Content Health
                    </h2>
                    <Card className="bg-card/40 backdrop-blur-md border-muted/20 p-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground font-medium">Platform Readiness</span>
                                <span className="font-bold">85%</span>
                            </div>
                            <Progress value={85} className="h-2" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Subject profiles complete</span>
                                <span className="ml-auto font-bold">{subjects.length}/10</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>All modules have lessons</span>
                                <span className="ml-auto font-bold text-green-500">Online</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm opacity-50">
                                <Activity className="h-4 w-4" />
                                <span>Quizzes updated for Grade 12</span>
                                <span className="ml-auto font-bold">Pending</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

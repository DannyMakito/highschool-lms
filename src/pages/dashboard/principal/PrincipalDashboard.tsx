import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    GraduationCap,
    Users,
    TrendingUp,
    BookOpen,
    Plus,
    ArrowRight,
    Search,
    Megaphone,
    Activity,
    ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';

const performanceData = [
    { name: 'Jan', average: 65, attendance: 92 },
    { name: 'Feb', average: 68, attendance: 88 },
    { name: 'Mar', average: 75, attendance: 94 },
    { name: 'Apr', average: 72, attendance: 91 },
    { name: 'May', average: 82, attendance: 95 },
    { name: 'Jun', average: 85, attendance: 98 },
];

const gradeDistribution = [
    { grade: '8', count: 120, color: '#818cf8' },
    { grade: '9', count: 145, color: '#6366f1' },
    { grade: '10', count: 132, color: '#4f46e5' },
    { grade: '11', count: 110, color: '#4338ca' },
    { grade: '12', count: 95, color: '#3730a3' },
];

export default function PrincipalDashboard() {
    const navigate = useNavigate();
    const { announcements } = useAnnouncements();
    const { subjects } = useSubjects();
    const { teachers, students } = useSchoolData();

    const stats = [
        { title: "School Performance", value: "85%", desc: "+4% from last term", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { title: "Active Teachers", value: teachers.length.toString(), desc: "All departments", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Total Students", value: students.length.toString(), desc: "Current enrollment", icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10" },
        { title: "Curriculum", value: subjects.length.toString(), desc: "Active subjects", icon: BookOpen, color: "text-orange-500", bg: "bg-orange-500/10" },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">Principal Command Center</h1>
                    <p className="text-muted-foreground font-medium">Real-time school monitoring and academic optimization.</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100/50">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">System Secured</span>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                            <p className="text-xs font-bold text-slate-400 mt-1">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 bg-white/40 backdrop-blur-xl border-white/20 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl font-black">
                                <Activity className="h-5 w-5 text-indigo-500" />
                                Academic Growth Analytics
                            </CardTitle>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Average school performance trends</p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black uppercase bg-white shadow-sm">Term</Button>
                            <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black uppercase text-slate-400">Year</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="average"
                                        stroke="#6366f1"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorAvg)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-slate-900 border-none shadow-2xl text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/30 transition-colors" />
                        <CardHeader>
                            <CardTitle className="text-lg font-black italic">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 relative z-10">
                            <Button
                                className="w-full justify-between h-auto py-4 px-4 bg-white/10 hover:bg-white/20 border-white/5 backdrop-blur-md rounded-2xl group/btn transition-all"
                                onClick={() => navigate("/principal/subjects")}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover/btn:scale-110 transition-transform">
                                        <Plus className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black leading-none mb-1 text-sm">Create Subject</h3>
                                        <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">New Curriculum</p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 opacity-40" />
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-between h-auto py-4 px-4 bg-white/5 hover:bg-white/10 border-white/5 backdrop-blur-md rounded-2xl group/btn transition-all text-white hover:text-white"
                                onClick={() => navigate("/principal/teachers")}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover/btn:scale-110 transition-transform">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black leading-none mb-1 text-sm">Staff Audit</h3>
                                        <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">Manage teachers</p>
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 opacity-40" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/40 backdrop-blur-xl border-white/20 shadow-sm overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Class Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[140px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={gradeDistribution}>
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {gradeDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                        <XAxis dataKey="grade" hide />
                                        <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-2 rounded-lg shadow-xl border-none">
                                                        <p className="text-[10px] font-black uppercase text-slate-400">Grade {payload[0].payload.grade}</p>
                                                        <p className="text-sm font-black">{payload[0].value} Students</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Announcements Section */}
                <Card className="lg:col-span-2 bg-white/40 backdrop-blur-xl border-white/20 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-100/50">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg font-black">
                                <Megaphone className="h-5 w-5 text-indigo-500" />
                                Recent School News
                            </CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate("/principal/announcements")} className="text-xs font-black uppercase text-indigo-600 hover:bg-indigo-50">View All</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100/50">
                            {announcements.slice(0, 3).map((a) => (
                                <div key={a.id} className="p-5 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-black text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{a.title}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(a.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.content}</p>
                                </div>
                            ))}
                        </div>
                        {announcements.length === 0 && (
                            <div className="py-12 text-center">
                                <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Megaphone className="h-6 w-6 text-slate-200" />
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No news posted yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Audit Card */}
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-none shadow-xl text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <CardHeader>
                        <CardTitle className="text-lg font-black flex items-center gap-2 relative z-10">
                            <Search className="h-5 w-5" />
                            Smart Audit
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                        <p className="text-xs font-medium leading-relaxed opacity-90">
                            Quickly review course materials, check teacher attendance, or generate academic reports for today.
                        </p>
                        <div className="space-y-2">
                            <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 border-none text-white font-bold h-10 rounded-xl transition-all">
                                Generate Today's Report
                            </Button>
                            <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 border-none text-white font-bold h-10 rounded-xl transition-all">
                                Review Lesson Plans
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


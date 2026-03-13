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
    Megaphone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnnouncements } from "@/hooks/useAnnouncements";

export default function PrincipalDashboard() {
    const navigate = useNavigate();
    const { announcements } = useAnnouncements();

    const stats = [
        { title: "School Performance", value: "B+", desc: "Average school grade", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
        { title: "Active Teachers", value: "42", desc: "Currently online", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Total Students", value: "856", desc: "Enrolled this term", icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10" },
        { title: "Curriculum", value: "12", desc: "Active subjects", icon: BookOpen, color: "text-orange-500", bg: "bg-orange-500/10" },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight">Principal Overview</h1>
                <p className="text-muted-foreground">Admin monitoring and school-wide performance tracking.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="bg-card/40 backdrop-blur-md border-muted/20 hover:border-primary/30 transition-all group cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                            <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 bg-card/40 backdrop-blur-md border-muted/20 order-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Academic Growth
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-xl">
                            <p className="text-muted-foreground text-sm">Performance analytics will appear here.</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4 order-2">
                    <h2 className="text-xl font-bold">Quick Actions</h2>
                    <div className="space-y-3">
                        <Button
                            className="w-full justify-between h-auto py-4 px-4 bg-primary hover:bg-primary/90"
                            onClick={() => navigate("/principal/subjects")}
                        >
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 rounded-lg bg-white/20">
                                    <Plus className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold leading-none mb-1">Create Subject</h3>
                                    <p className="text-[10px] opacity-80 uppercase font-black tracking-widest">Add to curriculum</p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-between h-auto py-4 px-4 bg-card/40 backdrop-blur-md border-muted/20 hover:bg-accent/50 group"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 rounded-lg bg-background border group-hover:border-primary/50 transition-colors">
                                    <Search className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold leading-none mb-1 text-foreground">Audit Courses</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Review materials</p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-between h-auto py-4 px-4 bg-card/40 backdrop-blur-md border-muted/20 hover:bg-accent/50 group"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 rounded-lg bg-background border group-hover:border-primary/50 transition-colors">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold leading-none mb-1 text-foreground">Teacher Reports</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">View activities</p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Announcements Section */}
                <Card className="lg:col-span-2 bg-card/40 backdrop-blur-md border-muted/20 order-3">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-primary" />
                            Recent Announcements
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => navigate("/principal/announcements")}>View All</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {announcements.slice(0, 3).map((a) => (
                            <div key={a.id} className="p-3 rounded-lg bg-background/50 border border-muted/20">
                                <h4 className="font-bold text-sm">{a.title}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-1">{a.content}</p>
                            </div>
                        ))}
                        {announcements.length === 0 && (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                                No announcements yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

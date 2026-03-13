
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Layers, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentSubjects() {
    const { user } = useAuth();
    const { studentSubjects } = useRegistrationData();
    const { subjects, getSubjectProgress, getSubjectLessonsCount, getSubjectCompletedLessonsCount, getSubjectTopics } = useSubjects();
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const filteredSubjects = useMemo(() => {
        // 1. Find subject IDs assigned to this student
        const assignedSubjectIds = studentSubjects
            .filter(ss => ss.studentId === user?.id)
            .map(ss => ss.subjectId);

        // 2. Filter the master subjects list
        return subjects
            .filter(s => assignedSubjectIds.includes(s.id))
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [subjects, studentSubjects, user?.id, searchTerm]);

    const handleSubjectClick = (subjectId: string) => {
        // Redirect to first lesson or course outline
        const topics = getSubjectTopics(subjectId);
        if (topics.length > 0) {
            navigate(`/student/subjects/${subjectId}/outline`);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight">My Courses</h1>
                <p className="text-muted-foreground">Courses you've started learning. Pick up where you left off.</p>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search your subjects..."
                    className="pl-10 h-11 bg-card/40 backdrop-blur-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {filteredSubjects.map((subject) => {
                    const progress = getSubjectProgress(subject.id);
                    const totalLessons = getSubjectLessonsCount(subject.id);
                    const completedLessons = getSubjectCompletedLessonsCount(subject.id);

                    return (
                        <Card
                            key={subject.id}
                            className="bg-card/40 backdrop-blur-md border-muted/20 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300"
                            onClick={() => handleSubjectClick(subject.id)}
                        >
                            <div className="relative aspect-video">
                                <img
                                    src={subject.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                                    alt={subject.name}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                />
                                <Badge className="absolute top-2 right-2 bg-green-500/80 backdrop-blur-md text-white border-none uppercase text-[10px] font-black tracking-widest px-2 py-0.5">
                                    {subject.accessType}
                                </Badge>
                            </div>
                            <CardContent className="p-5 space-y-3">
                                <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">{subject.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                    {subject.description}
                                </p>
                                <div className="flex gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                    <div className="flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>{subject.modulesCount} modules</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>{subject.lessonsCount} lessons</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-5 pt-0 flex flex-col gap-3">
                                <div className="w-full flex justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground">{completedLessons}/{totalLessons} lessons</span>
                                    <span className="text-primary">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2 bg-muted/20" />
                            </CardFooter>
                        </Card>
                    );
                })}

                {filteredSubjects.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-card/20 border-muted/20">
                        <p className="text-muted-foreground font-medium">No subjects found. Enroll in a course to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

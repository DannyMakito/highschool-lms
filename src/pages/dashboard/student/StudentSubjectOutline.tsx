
import { useParams, useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function StudentSubjectOutline() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { subjects, getSubjectTopics, getTopicLessons, isLessonCompleted, getSubjectProgress } = useSubjects();

    const subject = subjects.find(s => s.id === id);
    if (!subject) return <div>Subject not found</div>;

    const topics = getSubjectTopics(id!);
    const progress = getSubjectProgress(id!);

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-8">
            <Button variant="ghost" onClick={() => navigate("/student/subjects")} className="-ml-3 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to my courses
            </Button>

            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b pb-8">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Grade {subject.gradeTier}</Badge>
                        <Badge variant="outline">{subject.accessType}</Badge>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter">{subject.name}</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">{subject.description}</p>
                </div>

                <div className="w-full md:w-64 space-y-3">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest px-1">
                        <span className="text-muted-foreground">Course Progress</span>
                        <span className="text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex gap-2">
                        <Button className="flex-1 bg-primary hover:bg-primary/90 font-bold" onClick={() => {
                            // Find first incomplete lesson or first lesson
                            for (const topic of topics) {
                                const lessons = getTopicLessons(topic.id);
                                for (const lesson of lessons) {
                                    if (!isLessonCompleted(lesson.id)) {
                                        navigate(`/student/subjects/${id}/lessons/${lesson.id}`);
                                        return;
                                    }
                                }
                            }
                            // If all complete, go to first lesson
                            if (topics.length > 0) {
                                const firstLessons = getTopicLessons(topics[0].id);
                                if (firstLessons.length > 0) {
                                    navigate(`/student/subjects/${id}/lessons/${firstLessons[0].id}`);
                                }
                            }
                        }}>
                            {progress === 100 ? "Review Course" : progress > 0 ? "Continue Learning" : "Start Learning"}
                        </Button>
                        <Button variant="outline" className="border-primary/20 hover:bg-primary/5 font-bold" onClick={() => navigate(`/student/subjects/${id}/discussions`)}>
                            Discussions
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-6 pb-20">
                <h2 className="text-2xl font-bold tracking-tight">Course Curriculum</h2>

                <div className="space-y-4">
                    {topics.map((topic, tIndex) => {
                        const lessons = getTopicLessons(topic.id);
                        const completedInTopic = lessons.filter(l => isLessonCompleted(l.id)).length;

                        return (
                            <div key={topic.id} className="space-y-3">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-6 h-6 rounded-md bg-muted border flex items-center justify-center text-[10px] font-black text-muted-foreground">
                                        {tIndex + 1}
                                    </div>
                                    <h3 className="font-bold text-lg">{topic.title}</h3>
                                    <span className="text-xs font-medium text-muted-foreground ml-auto">
                                        {completedInTopic}/{lessons.length} lessons
                                    </span>
                                </div>
                                <div className="grid gap-2">
                                    {lessons.map((lesson) => {
                                        const completed = isLessonCompleted(lesson.id);
                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() => navigate(`/student/subjects/${id}/lessons/${lesson.id}`)}
                                                className={`flex items-center justify-between p-4 rounded-xl border bg-card/40 backdrop-blur-sm hover:bg-accent/50 transition-all cursor-pointer group ${completed ? 'border-primary/20' : 'border-muted/20'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${completed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                        <Play className="h-4 w-4 fill-current" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold">{lesson.title}</h4>
                                                        <p className="text-xs text-muted-foreground tracking-wide font-medium">Video Lesson • 10m</p>
                                                    </div>
                                                </div>
                                                {completed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                )}
                                            </div>
                                        );
                                    })}
                                    {lessons.length === 0 && (
                                        <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
                                            Lessons coming soon.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

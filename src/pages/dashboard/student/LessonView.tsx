import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Play,
    Layout,
    Circle,
    ArrowLeft,
    BookOpen
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LessonView() {
    const { id: subjectId, lessonId } = useParams();
    const navigate = useNavigate();
    const { subjects, getSubjectTopics, getTopicLessons, isLessonCompleted, toggleLessonCompletion, setLastLesson } = useSubjects();

    React.useEffect(() => {
        if (subjectId && lessonId) {
            setLastLesson(subjectId, lessonId);
        }
    }, [subjectId, lessonId, setLastLesson]);

    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return <div>Subject not found</div>;

    const topics = getSubjectTopics(subjectId!);
    const currentTopicId = topics.find(t => getTopicLessons(t.id).some(l => l.id === lessonId))?.id;
    const currentLessons = currentTopicId ? getTopicLessons(currentTopicId) : [];
    const currentLesson = currentLessons.find(l => l.id === lessonId);

    if (!currentLesson) return <div>Lesson not found</div>;

    const totalLessons = topics.reduce((acc, t) => acc + getTopicLessons(t.id).length, 0);
    const completed = isLessonCompleted(lessonId!);

    // Navigation logic
    const getAllLessons = () => {
        const all: any[] = [];
        topics.forEach(t => {
            getTopicLessons(t.id).forEach(l => all.push({ ...l, topicId: t.id }));
        });
        return all;
    };

    const allLessons = getAllLessons();
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    const prevLesson = allLessons[currentIndex - 1];
    const nextLesson = allLessons[currentIndex + 1];

    const handleNext = () => {
        if (!completed) toggleLessonCompletion(lessonId!);
        if (nextLesson) {
            navigate(`/student/subjects/${subjectId}/lessons/${nextLesson.id}`);
        } else {
            navigate(`/student/subjects/${subjectId}/outline`);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Outline Sidebar */}
            <div className="hidden lg:flex w-80 border-r flex-col min-h-0 bg-card/40 backdrop-blur-md">
                <div className="p-6 border-b space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/student/subjects/${subjectId}/outline`)} className="-ml-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to course
                    </Button>
                    <div className="space-y-1">
                        <h2 className="text-sm font-black uppercase tracking-widest text-primary">{subject.name}</h2>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-muted-foreground">{totalLessons} lessons total</span>
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                        {topics.map((topic, tIndex) => {
                            const lessons = getTopicLessons(topic.id);
                            const isCurrentTopic = topic.id === currentTopicId;

                            return (
                                <Collapsible key={topic.id} defaultOpen={isCurrentTopic} className="space-y-2">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent/50 group text-left">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                {tIndex + 1}
                                            </span>
                                            <span className="text-sm font-bold truncate max-w-[180px]">{topic.title}</span>
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-1 pl-8 pr-2">
                                        {lessons.map((lesson) => {
                                            const isCurrent = lesson.id === lessonId;
                                            const isDone = isLessonCompleted(lesson.id);
                                            return (
                                                <Link
                                                    key={lesson.id}
                                                    to={`/student/subjects/${subjectId}/lessons/${lesson.id}`}
                                                    className={`flex items-center gap-3 p-2 rounded-lg text-xs font-medium transition-all ${isCurrent ? 'bg-primary/10 text-primary shadow-sm' : 'hover:bg-accent/50 text-muted-foreground'}`}
                                                >
                                                    {isDone ? (
                                                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                                    ) : isCurrent ? (
                                                        <Play className="h-4 w-4 fill-current flex-shrink-0" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    )}
                                                    <span className="truncate">{lesson.title}</span>
                                                </Link>
                                            );
                                        })}
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-background/95">
                <ScrollArea className="flex-1 h-full">
                    <div className="w-full px-4 lg:px-16 space-y-10">
                        {/* Header */}
                        <div className="flex flex-col gap-4 pb-2">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-100">{currentLesson.title}</h1>
                                    <p className="text-slate-400 font-medium">Part of {subject.name} • {currentIndex + 1} of {totalLessons} lessons</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {completed ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-4 py-1.5 rounded-full flex items-center gap-2 font-bold transition-all">
                                            <CheckCircle2 className="h-4 w-4" /> Completed
                                        </Badge>
                                    ) : (
                                        <Button
                                            className="font-bold h-11 px-8 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                                            onClick={() => toggleLessonCompletion(lessonId!)}
                                        >
                                            Mark as Completed
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Video Section */}
                        {currentLesson.videoUrl && (
                            <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem] bg-black aspect-video relative group ring-1 ring-white/10">
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
                                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer hover:scale-110 shadow-2xl shadow-primary/40 transition-transform">
                                        <Play className="h-8 w-8 fill-current ml-1" />
                                    </div>
                                </div>
                                {currentLesson.videoUrl.includes('youtube.com') || currentLesson.videoUrl.includes('youtu.be') ? (
                                    <iframe
                                        src={currentLesson.videoUrl.replace('watch?v=', 'embed/')}
                                        className="w-full h-full border-none"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <img
                                        src="https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=1600&auto=format&fit=crop&q=80"
                                        alt="Video Placeholder"
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                )}
                                {/* Progress overlay for video */}
                                <div className="absolute bottom-8 left-8 right-8 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
                                    <div className="w-1/3 h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                                </div>
                            </Card>
                        )}

                        {/* Content Section */}
                        <div className="space-y-8 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] p-8 lg:p-12 border border-white/5 shadow-2xl">
                            <div className="flex items-center gap-3 text-primary">
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <Layout className="h-6 w-6" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-100">Lesson Notes</h2>
                            </div>

                            <div className="prose prose-invert prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-slate-100 prose-a:text-primary prose-ul:text-slate-300 prose-ol:text-slate-300">
                                <h1 className="text-3xl mb-6">{currentLesson.title}</h1>
                                {currentLesson.content ? (
                                    <div
                                        className="lesson-content-display"
                                        dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                                    />
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="p-4 rounded-full bg-slate-800/50">
                                            <BookOpen className="h-8 w-8 text-slate-500" />
                                        </div>
                                        <p className="text-slate-500 font-medium">No extra notes provided for this lesson.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Nav */}
                        <div className="flex items-center justify-between py-10 border-t border-muted/20 pt-10">
                            <Button
                                variant="ghost"
                                className="h-14 px-6 rounded-2xl group flex flex-col items-start gap-1 justify-center disabled:opacity-30"
                                onClick={() => prevLesson && navigate(`/student/subjects/${subjectId}/lessons/${prevLesson.id}`)}
                                disabled={!prevLesson}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                    <ChevronLeft className="h-3 w-3" /> Previous Lesson
                                </span>
                                <span className="font-bold truncate max-w-[200px]">{prevLesson?.title || "Course Start"}</span>
                            </Button>

                            <Button
                                className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 flex flex-col items-end gap-1 justify-center"
                                onClick={handleNext}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1">
                                    {nextLesson ? "Next Lesson" : "Finish Course"} <ChevronRight className="h-3 w-3" />
                                </span>
                                <span className="font-bold truncate max-w-[200px]">{nextLesson?.title || "Course Wrap-up"}</span>
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

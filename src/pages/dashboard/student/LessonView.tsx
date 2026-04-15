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
    BookOpen,
    Download,
    FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import StudentPdfWorkspace from "@/components/student/StudentPdfWorkspace";

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

    const videoUrl = currentLesson.videoUrl?.trim();
    const isYouTubeVideo = Boolean(videoUrl && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")));
    const isVimeoVideo = Boolean(videoUrl && videoUrl.includes("vimeo.com"));
    const isDirectVideoFile = Boolean(
        currentLesson.videoType === "upload" ||
        currentLesson.videoMimeType?.startsWith("video/") ||
        (videoUrl && /\.(mp4|webm|ogg)(\?|$)/i.test(videoUrl))
    );
    const youtubeEmbedUrl = videoUrl
        ? videoUrl
            .replace("watch?v=", "embed/")
            .replace("youtu.be/", "youtube.com/embed/")
        : "";
    const vimeoEmbedUrl = videoUrl && isVimeoVideo
        ? `https://player.vimeo.com/video/${videoUrl.split("/").filter(Boolean).pop()?.split("?")[0]}`
        : "";
    const lessonResourceUrl = currentLesson.resourceUrl?.trim();
    const isLessonPdf = currentLesson.resourceType === "pdf" || currentLesson.resourceMimeType === "application/pdf" || Boolean(lessonResourceUrl && /\.pdf(\?|$)/i.test(lessonResourceUrl));

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
                                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-indigo-400">{currentLesson.title}</h1>
                                    <p className="text-indigo-400 font-medium">Part of {subject.name} • {currentIndex + 1} of {totalLessons} lessons</p>
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
                        {videoUrl && (
                            <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem] bg-black aspect-video relative group ring-1 ring-white/10">
                                {isYouTubeVideo ? (
                                    <iframe
                                        src={youtubeEmbedUrl}
                                        className="w-full h-full border-none"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : isVimeoVideo ? (
                                    <iframe
                                        src={vimeoEmbedUrl}
                                        className="w-full h-full border-none"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : isDirectVideoFile ? (
                                    <video
                                        src={videoUrl}
                                        controls
                                        className="w-full h-full"
                                        preload="metadata"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/80 px-8 text-center">
                                        <Play className="h-12 w-12 text-primary" />
                                        <div>
                                            <p className="font-bold text-lg">Video attached for this lesson</p>
                                            <a href={videoUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                                                Open video in a new tab
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Content Section */}
                        <div className="space-y-8 bg-white-900/40 backdrop-blur-xl rounded-[2rem] p-8 lg:p-12 border border-white/5 shadow-2xl">
                            <div className="flex items-center gap-3 text-primary">
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <Layout className="h-6 w-6" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-indigo-400">Lesson Notes</h2>
                            </div>

                            <div className="prose prose-invert prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-800 prose-p:text-black prose-strong:text-black prose-a:text-primary prose-ul:text-black prose-ol:text-black">
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
                                        <p className="text-black font-medium">No extra notes provided for this lesson.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {lessonResourceUrl ? (
                            <div className="space-y-6 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 lg:p-8 border border-muted/20 shadow-xl">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3 text-primary">
                                            <FileText className="h-5 w-5" />
                                            <h2 className="text-2xl font-black tracking-tight text-slate-900">Lesson File</h2>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            {currentLesson.resourceFileName || "Lesson resource"} is attached to this lesson.
                                        </p>
                                    </div>
                                    <a href={lessonResourceUrl} target="_blank" rel="noreferrer">
                                        <Button type="button" variant="outline">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download File
                                        </Button>
                                    </a>
                                </div>

                                {isLessonPdf ? (
                                    <StudentPdfWorkspace
                                        documentId={`lesson:${currentLesson.id}`}
                                        pdfUrl={lessonResourceUrl}
                                        fileName={currentLesson.resourceFileName || "lesson-resource.pdf"}
                                        title="Lesson PDF Notes"
                                    />
                                ) : (
                                    <Card className="border-dashed border-muted/30 bg-background/70">
                                        <div className="p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900">{currentLesson.resourceFileName || "Attached lesson file"}</p>
                                                <p className="text-sm text-muted-foreground">Open or download this file from the lesson.</p>
                                            </div>
                                            <a href={lessonResourceUrl} target="_blank" rel="noreferrer">
                                                <Button type="button">Open File</Button>
                                            </a>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        ) : null}

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

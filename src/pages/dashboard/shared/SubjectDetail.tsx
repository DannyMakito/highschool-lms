
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, Video, Save, Layout, HelpCircle, X, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@/components/ui/collapsible";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SubjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { subjects, addTopic, updateTopic, addLesson, updateLesson, getSubjectTopics, getTopicLessons } = useSubjects();
    const subject = subjects.find(s => s.id === id);

    const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
    const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newLesson, setNewLesson] = useState({
        title: "",
        content: "",
        videoUrl: "",
    });
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

    if (!subject) return <div>Subject not found</div>;

    const topics = getSubjectTopics(id!);

    const handleAddTopic = () => {
        if (!newTopicTitle) return;
        addTopic({
            subjectId: id!,
            title: newTopicTitle,
            order: topics.length + 1,
        });
        setNewTopicTitle("");
        setIsTopicDialogOpen(false);
    };

    const handleAddLesson = () => {
        if (!newLesson.title || !selectedTopicId) return;

        if (editingLessonId) {
            updateLesson(editingLessonId, {
                title: newLesson.title,
                content: newLesson.content,
                videoUrl: newLesson.videoUrl,
            });
        } else {
            addLesson({
                topicId: selectedTopicId,
                title: newLesson.title,
                content: newLesson.content,
                videoUrl: newLesson.videoUrl,
                order: getTopicLessons(selectedTopicId).length + 1,
            });
        }

        setNewLesson({ title: "", content: "", videoUrl: "" });
        setEditingLessonId(null);
        setIsLessonDialogOpen(false);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Subjects
            </Button>

            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b pb-8">
                <div className="flex gap-6 items-start">
                    <div className="w-32 h-32 rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-muted">
                        <img
                            src={subject.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                            alt={subject.name}
                            className="object-cover w-full h-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Grade {subject.gradeTier}</Badge>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">{subject.name}</h1>
                        <p className="text-muted-foreground max-w-2xl">{subject.description}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="border-indigo-200 hover:bg-indigo-50 text-indigo-600" onClick={() => navigate(`/teacher/subjects/${id}/discussions`)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Discussions
                    </Button>

                    <Button variant="outline" className="border-indigo-200 hover:bg-indigo-50 text-indigo-600" onClick={() => navigate(`/teacher/subjects/${id}/quizzes/create`)}>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Create Quiz
                    </Button>

                    <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Module
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Module</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Module Title</Label>
                                    <Input
                                        placeholder="e.g. Introduction to Algebra"
                                        value={newTopicTitle}
                                        onChange={(e) => setNewTopicTitle(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddTopic}>Save Module</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary" />
                    Course Content
                </h2>

                <div className="space-y-3">
                    {topics.map((topic, index) => {
                        const lessons = getTopicLessons(topic.id);
                        return (
                            <Collapsible key={topic.id} className="border rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm group">
                                <div className="flex items-center justify-between p-4 group-hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Module</p>
                                            <h3 className="font-bold">{topic.title}</h3>
                                            <p className="text-xs text-muted-foreground">{lessons.length} lessons</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={() => {
                                                setSelectedTopicId(topic.id);
                                                setEditingLessonId(null);
                                                setNewLesson({ title: "", content: "", videoUrl: "" });
                                                setIsLessonDialogOpen(true);
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Lesson
                                        </Button>
                                        <CollapsibleTrigger asChild>
                                            <Button size="icon" variant="ghost">
                                                <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:-rotate-90" />
                                            </Button>
                                        </CollapsibleTrigger>
                                    </div>
                                </div>
                                <CollapsibleContent className="border-t bg-background/30 p-2 space-y-1">
                                    {lessons.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 group/lesson cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover/lesson:border-primary transition-colors" />
                                                <span className="font-medium">{lesson.title}</span>
                                                {lesson.videoUrl && <Video className="w-3.5 h-3.5 text-muted-foreground" />}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover/lesson:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTopicId(topic.id);
                                                    setEditingLessonId(lesson.id);
                                                    setNewLesson({
                                                        title: lesson.title,
                                                        content: lesson.content,
                                                        videoUrl: lesson.videoUrl || "",
                                                    });
                                                    setIsLessonDialogOpen(true);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        </div>
                                    ))}
                                    {lessons.length === 0 && (
                                        <p className="p-4 text-center text-sm text-muted-foreground">No lessons yet.</p>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}

                    {topics.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl">
                            <p className="text-muted-foreground">No modules created yet. Start building your course!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Full-screen Lesson Creation/Edit Overlay */}
            {isLessonDialogOpen && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden font-sans">
                    <header className="h-20 border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-11 w-11 bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors"
                                onClick={() => setIsLessonDialogOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                    {editingLessonId ? "Edit Lesson" : "New Lesson"}
                                </p>
                                <h2 className="text-sm font-black text-slate-900 line-clamp-1">
                                    {newLesson.title || "Untitled Lesson"}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl px-6 h-11 font-black text-slate-600 border-slate-200"
                                onClick={() => setIsLessonDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 h-11 font-black transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                onClick={handleAddLesson}
                            >
                                <Save className="h-4 w-4" />
                                {editingLessonId ? "Save Changes" : "Create Lesson"}
                            </Button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-slate-50/30 p-6 md:p-12">
                        <div className="max-w-5xl mx-auto space-y-12">
                            <div className="grid gap-8 lg:grid-cols-12">
                                <div className="lg:col-span-8 space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Lesson Title</Label>
                                        <Input
                                            placeholder="e.g. Visualizing Data with Matplotlib"
                                            value={newLesson.title}
                                            onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                                            className="text-2xl h-16 font-bold rounded-2xl border-slate-200 bg-white shadow-sm px-6 focus:ring-4 focus:ring-primary/5"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Lesson Content</Label>
                                        <RichTextEditor
                                            content={newLesson.content}
                                            onChange={(html) => setNewLesson({ ...newLesson, content: html })}
                                            minHeight="600px"
                                            className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden"
                                        />
                                    </div>
                                </div>

                                <div className="lg:col-span-4 space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Lesson Video (Optional)</Label>
                                        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                                            <CardContent className="p-6 space-y-6">
                                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 group cursor-pointer hover:border-primary/50 transition-all">
                                                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-400 group-hover:text-primary transition-colors shadow-sm">
                                                        <Video className="h-6 w-6" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">Drop a video here</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">MP4, WEBM or OGG (Max 50MB)</p>
                                                    <Button variant="ghost" className="mt-4 text-primary font-bold hover:bg-primary/5">Browse Files</Button>
                                                </div>

                                                <div className="space-y-2 pt-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Or Video URL</Label>
                                                    <Input
                                                        placeholder="YouTube or Vimeo URL"
                                                        value={newLesson.videoUrl}
                                                        onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                                                        className="h-12 rounded-xl border-slate-200"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card className="rounded-3xl border-indigo-100 bg-indigo-50/50 shadow-none border-t-4 border-t-indigo-500">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                                                    <HelpCircle className="h-5 w-5" />
                                                </div>
                                                <h4 className="font-black text-slate-900">Tips for great lessons</h4>
                                            </div>
                                            <ul className="space-y-3 text-xs font-bold text-slate-500">
                                                <li className="flex items-start gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                                                    Use headings to organize your content.
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                                                    Add images to make the lesson more engaging.
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                                                    Include video explanations for complex topics.
                                                </li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            )}
        </div>
    );
}

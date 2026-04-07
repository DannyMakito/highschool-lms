
import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, Video, Save, Layout, HelpCircle, X, MessageSquare, Upload, Loader2, PlayCircle } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import supabase, { supabaseKey, supabaseUrl } from "@/lib/supabase";

export default function SubjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { subjects, addTopic, addLesson, updateLesson, getSubjectTopics, getTopicLessons } = useSubjects();
    const subject = subjects.find(s => s.id === id);

    const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
    const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newLesson, setNewLesson] = useState({
        title: "",
        content: "",
        videoUrl: "",
        videoType: undefined as "external" | "upload" | undefined,
        videoFilePath: null as string | null,
        videoFileName: null as string | null,
        videoMimeType: null as string | null,
    });
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    if (!subject) return <div>Subject not found</div>;

    const topics = getSubjectTopics(id!);

    const resetLessonForm = () => {
        setNewLesson({
            title: "",
            content: "",
            videoUrl: "",
            videoType: undefined,
            videoFilePath: null,
            videoFileName: null,
            videoMimeType: null,
        });
        setEditingLessonId(null);
        setUploadProgress(0);
    };

    const uploadLessonVideoWithProgress = async (filePath: string, file: File) => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
            throw new Error("You must be signed in to upload lesson videos.");
        }

        const uploadUrl = `${supabaseUrl}/storage/v1/object/lesson-videos/${filePath}`;

        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open("POST", uploadUrl);
            xhr.setRequestHeader("apikey", supabaseKey);
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
            xhr.setRequestHeader("x-upsert", "false");
            xhr.setRequestHeader("cache-control", "3600");
            xhr.setRequestHeader("Content-Type", file.type);

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) {
                    return;
                }

                const nextProgress = Math.min(100, Math.round((event.loaded / event.total) * 100));
                setUploadProgress(nextProgress);
            };

            xhr.onerror = () => {
                reject(new Error("The upload failed before the server could respond."));
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setUploadProgress(100);
                    resolve();
                    return;
                }

                try {
                    const parsedError = JSON.parse(xhr.responseText);
                    reject(new Error(parsedError.message || "Upload failed."));
                } catch {
                    reject(new Error("Upload failed."));
                }
            };

            xhr.send(file);
        });
    };

    const handleAddTopic = async () => {
        if (!newTopicTitle) return;
        try {
            await addTopic({
                subjectId: id!,
                title: newTopicTitle,
                order: topics.length + 1,
            });
            setNewTopicTitle("");
            setIsTopicDialogOpen(false);
            toast.success("Module added");
        } catch (error) {
            console.error("Failed to add topic", error);
            toast.error("Could not save the module");
        }
    };

    const handleVideoFileSelected = async (file?: File | null) => {
        if (!file || !id || !selectedTopicId || !user?.id) return;

        const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Please upload an MP4, WEBM, or OGG video");
            return;
        }

        const maxSizeBytes = 100 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            toast.error("Video files must be 100MB or smaller");
            return;
        }

        setIsUploadingVideo(true);
        setUploadProgress(0);

        try {
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `${id}/${selectedTopicId}/${user.id}/${Date.now()}_${sanitizedName}`;

            await uploadLessonVideoWithProgress(filePath, file);

            const { data: publicUrlData } = supabase.storage.from("lesson-videos").getPublicUrl(filePath);

            setNewLesson((prev) => ({
                ...prev,
                videoUrl: publicUrlData.publicUrl,
                videoType: "upload",
                videoFilePath: filePath,
                videoFileName: file.name,
                videoMimeType: file.type,
            }));

            toast.success("Video uploaded");
        } catch (error) {
            console.error("Failed to upload lesson video", error);
            toast.error("Could not upload the lesson video");
        } finally {
            setIsUploadingVideo(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const clearVideo = async () => {
        try {
            if (newLesson.videoType === "upload" && newLesson.videoFilePath) {
                const isEditingExistingLesson = Boolean(editingLessonId);

                if (!isEditingExistingLesson) {
                    await supabase.storage.from("lesson-videos").remove([newLesson.videoFilePath]);
                }
            }
        } catch (error) {
            console.error("Failed to clear uploaded video", error);
        }

        setNewLesson((prev) => ({
            ...prev,
            videoUrl: "",
            videoType: undefined,
            videoFilePath: null,
            videoFileName: null,
            videoMimeType: null,
        }));
    };

    const handleAddLesson = async () => {
        if (!newLesson.title || !selectedTopicId) return;

        try {
            const currentLesson = editingLessonId
                ? getTopicLessons(selectedTopicId).find((lesson) => lesson.id === editingLessonId)
                : null;

            const lessonPayload = {
                title: newLesson.title,
                content: newLesson.content,
                videoUrl: newLesson.videoUrl || undefined,
                videoType: newLesson.videoUrl ? (newLesson.videoType ?? "external") : undefined,
                videoFilePath: newLesson.videoFilePath,
                videoFileName: newLesson.videoFileName,
                videoMimeType: newLesson.videoMimeType,
            };

            if (editingLessonId) {
                await updateLesson(editingLessonId, lessonPayload);

                if (
                    currentLesson?.videoType === "upload" &&
                    currentLesson.videoFilePath &&
                    currentLesson.videoFilePath !== newLesson.videoFilePath
                ) {
                    await supabase.storage.from("lesson-videos").remove([currentLesson.videoFilePath]);
                }
            } else {
                await addLesson({
                    topicId: selectedTopicId,
                    ...lessonPayload,
                    order: getTopicLessons(selectedTopicId).length + 1,
                });
            }

            resetLessonForm();
            setIsLessonDialogOpen(false);
            toast.success(editingLessonId ? "Lesson updated" : "Lesson created");
        } catch (error) {
            console.error("Failed to save lesson", error);
            toast.error("Could not save the lesson");
        }
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
                                                resetLessonForm();
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
                                                        videoType: lesson.videoType,
                                                        videoFilePath: lesson.videoFilePath || null,
                                                        videoFileName: lesson.videoFileName || null,
                                                        videoMimeType: lesson.videoMimeType || null,
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
                                                        {isUploadingVideo ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {isUploadingVideo ? `Uploading video... ${uploadProgress}%` : "Upload a lesson video"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {isUploadingVideo ? "Large files depend on your internet speed. Keep this lesson editor open while the upload completes." : "MP4, WEBM or OGG (Max 100MB)"}
                                                    </p>
                                                    {isUploadingVideo ? (
                                                        <div className="mt-4 space-y-2">
                                                            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                                                                    style={{ width: `${uploadProgress}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-[11px] font-bold text-primary">{uploadProgress}% uploaded</p>
                                                        </div>
                                                    ) : null}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="mt-4 text-primary font-bold hover:bg-primary/5"
                                                        disabled={isUploadingVideo}
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        Browse Files
                                                    </Button>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="video/mp4,video/webm,video/ogg"
                                                        className="hidden"
                                                        onChange={(e) => handleVideoFileSelected(e.target.files?.[0] || null)}
                                                    />
                                                </div>

                                                <div className="space-y-2 pt-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Or Video URL</Label>
                                                    <Input
                                                        placeholder="YouTube or Vimeo URL"
                                                        value={newLesson.videoUrl}
                                                        onChange={(e) => setNewLesson({
                                                            ...newLesson,
                                                            videoUrl: e.target.value,
                                                            videoType: e.target.value ? "external" : undefined,
                                                            videoFilePath: e.target.value ? null : newLesson.videoFilePath,
                                                            videoFileName: e.target.value ? null : newLesson.videoFileName,
                                                            videoMimeType: e.target.value ? null : newLesson.videoMimeType,
                                                        })}
                                                        className="h-12 rounded-xl border-slate-200"
                                                    />
                                                </div>

                                                {newLesson.videoUrl && (
                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                                                                    <PlayCircle className="h-4 w-4 text-primary" />
                                                                    {newLesson.videoType === "upload" ? (newLesson.videoFileName || "Uploaded lesson video") : "External video link"}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 truncate">{newLesson.videoUrl}</p>
                                                            </div>
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => void clearVideo()}>
                                                                Clear
                                                            </Button>
                                                        </div>
                                                        {newLesson.videoType === "upload" && newLesson.videoMimeType?.startsWith("video/") ? (
                                                            <video
                                                                src={newLesson.videoUrl}
                                                                controls
                                                                className="w-full rounded-xl bg-black"
                                                            />
                                                        ) : null}
                                                    </div>
                                                )}
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

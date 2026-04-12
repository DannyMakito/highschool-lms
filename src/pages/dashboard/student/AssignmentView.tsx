import { type DragEvent, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAssignments } from "@/hooks/useAssignments";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronLeft,
    Upload,
    Send,
    CheckCircle2,
    MessageSquare,
    FileText,
    History,
    LinkIcon,
    Download,
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import supabase from "@/lib/supabase";
import StudentPdfWorkspace from "@/components/student/StudentPdfWorkspace";
import StudentSubmissionView from "@/components/student/StudentSubmissionView";

export default function AssignmentView() {
    const { id: assignmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { assignments, submissions, submitWork, getRubric } = useAssignments();

    const assignment = assignments.find(a => a.id === assignmentId);
    const submission = submissions.find(s => s.assignmentId === assignmentId && s.studentId === user?.id);
    const rubric = getRubric(assignment?.rubricId);

    const [content, setContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!assignment) return <div>Assignment not found</div>;

    const isGraded = submission?.status === "graded" && submission.isReleased;
    const availableFrom = new Date(assignment.availableFrom || assignment.createdAt);
    const isOpen = availableFrom.getTime() <= Date.now();
    const assignmentAttachmentIsPdf = assignment.attachmentType === "pdf" || assignment.attachmentMimeType === "application/pdf" || Boolean(assignment.attachmentUrl && /\.pdf(\?|$)/i.test(assignment.attachmentUrl));
    const submissionIsPdf = submission?.fileType === "pdf";

    const handleFileSelected = (file?: File | null) => {
        if (!file) return;

        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            toast.error("Please upload a PDF file");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("PDF uploads must be 10MB or smaller");
            return;
        }

        setSelectedFile(file);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isOpen) return;
        handleFileSelected(event.dataTransfer.files?.[0] || null);
    };

    const handleSubmit = async () => {
        const hasText = content.trim().length > 0;
        const hasFile = !!selectedFile;

        if (assignment.submissionType === "text" && !hasText) {
            toast.error("Please provide some content for your submission");
            return;
        }

        if (assignment.submissionType === "pdf" && !hasFile) {
            toast.error("Please upload a PDF file");
            return;
        }

        if (assignment.submissionType === "both" && !hasText && !hasFile) {
            toast.error("Please provide either your essay text or a PDF file");
            return;
        }

        setIsSubmitting(true);
        try {
            let submissionContent = content;
            let submissionFileType: "pdf" | "text" = "text";

            if (selectedFile) {
                toast.loading("Uploading PDF file...", { id: "assignment-upload" });

                const fileName = `${assignmentId}/${user?.id}/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                const { error: uploadError } = await supabase.storage
                    .from("assignment-submissions")
                    .upload(fileName, selectedFile, {
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (uploadError) {
                    toast.dismiss("assignment-upload");
                    throw uploadError;
                }

                const { data: publicUrlData } = supabase.storage.from("assignment-submissions").getPublicUrl(fileName);
                submissionContent = publicUrlData.publicUrl;
                submissionFileType = "pdf";

                toast.success("PDF uploaded successfully", { id: "assignment-upload" });
            }

            toast.loading("Submitting assignment...", { id: "assignment-submit" });
            await submitWork({
                assignmentId: assignmentId || "",
                studentId: user?.id || "",
                studentName: user?.name || "Student",
                content: submissionContent,
                fileType: submissionFileType,
            });

            toast.success("Assignment submitted successfully", { id: "assignment-submit" });
            setContent("");
            setSelectedFile(null);
        } catch (error: any) {
            console.error("[AssignmentView] Submission error:", error);
            toast.error(error?.message || "Error submitting assignment. Please try again.", { id: "assignment-submit" });
        } finally {
            toast.dismiss("assignment-upload");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-6 py-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Assignments
            </Button>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 border-none shadow-premium bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                                {assignment.submissionType === "both" ? "PDF & Text" : assignment.submissionType}
                            </Badge>
                            {assignment.attachmentUrl ? <Badge variant="secondary">Teacher File Attached</Badge> : null}
                        </div>
                        <CardTitle className="text-3xl font-bold">{assignment.title}</CardTitle>
                        <div
                            className="prose prose-slate max-w-none dark:prose-invert text-slate-600 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: assignment.description || "Read the instructions carefully and submit your work before the deadline." }}
                        />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {assignment.attachmentUrl ? (
                            <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                                        <FileText className="h-5 w-5" />
                                        Assignment File
                                    </CardTitle>
                                    <CardDescription>
                                        {assignment.attachmentFileName || "Teacher attachment"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer">
                                            <Button type="button" variant="outline">
                                                <LinkIcon className="mr-2 h-4 w-4" />
                                                Open File
                                            </Button>
                                        </a>
                                        <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer">
                                            <Button type="button" variant="ghost">
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                            </Button>
                                        </a>
                                    </div>

                                    {assignmentAttachmentIsPdf ? (
                                        <StudentPdfWorkspace
                                            documentId={`assignment-brief:${assignment.id}`}
                                            pdfUrl={assignment.attachmentUrl}
                                            fileName={assignment.attachmentFileName || "assignment-brief.pdf"}
                                            title="Assignment PDF Notes"
                                        />
                                    ) : null}
                                </CardContent>
                            </Card>
                        ) : null}

                        {!submission ? (
                            <div className="space-y-4">
                                {!isOpen && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                                        This assessment opens on <span className="font-bold">{availableFrom.toLocaleDateString()}</span>. You can review the instructions now, but submission is locked until then.
                                    </div>
                                )}

                                {(assignment.submissionType === "text" || assignment.submissionType === "both") && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold flex items-center gap-2">
                                            <History className="h-4 w-4 text-primary" />
                                            Your Essay / Text Submission
                                        </h3>
                                        <Textarea
                                            placeholder="Type or paste your essay here..."
                                            className="min-h-[400px] font-serif text-lg leading-relaxed p-6 rounded-2xl border-2 focus-visible:ring-primary/20"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            disabled={isSubmitting || !isOpen}
                                        />
                                    </div>
                                )}

                                {(assignment.submissionType === "pdf" || assignment.submissionType === "both") && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold flex items-center gap-2">
                                            <Upload className="h-4 w-4 text-primary" />
                                            Upload PDF Document
                                        </h3>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".pdf"
                                            disabled={!isOpen || isSubmitting}
                                            onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
                                        />
                                        <div
                                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${isOpen ? 'group' : 'opacity-60 cursor-not-allowed'} ${selectedFile ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5 hover:border-primary/40'}`}
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                            }}
                                            onDrop={handleDrop}
                                        >
                                            {selectedFile ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <CheckCircle2 className="h-12 w-12 text-primary mb-2" />
                                                    <p className="font-bold text-primary">{selectedFile.name}</p>
                                                    <p className="text-xs text-muted-foreground">Ready to submit</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-12 w-12 text-primary/40 group-hover:text-primary transition-colors mb-4" />
                                                    <p className="font-bold text-primary/60 group-hover:text-primary">Drag a PDF here or browse for a file</p>
                                                    <p className="text-xs text-muted-foreground mt-2">Maximum file size: 10MB</p>
                                                </>
                                            )}
                                            <div className="mt-4 flex justify-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={!isOpen || isSubmitting}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        fileInputRef.current?.click();
                                                    }}
                                                >
                                                    Choose PDF
                                                </Button>
                                                {selectedFile ? (
                                                    <Button type="button" variant="ghost" onClick={() => setSelectedFile(null)}>
                                                        Clear
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        className="flex-1 h-12 font-black text-lg gap-2"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !isOpen || (assignment.submissionType === "text" && !content.trim())}
                                    >
                                        <Send className="h-5 w-5" />
                                        {isSubmitting ? "Submitting..." : !isOpen ? "Assessment Locked" : "Submit Assignment"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {submissionIsPdf ? (
                                    submission?.content ? (
                                        <StudentSubmissionView
                                            submissionId={submission.id}
                                            pdfUrl={submission.content}
                                            fileType="pdf"
                                            fileName={submission.content.split('/').pop()?.split('?')[0] || 'submission.pdf'}
                                        />
                                    ) : null
                                ) : (
                                    <StudentSubmissionView
                                        submissionId={submission.id}
                                        content={submission.content}
                                        fileType="text"
                                        fileName="Essay Submission"
                                    />
                                )}

                                {isGraded && (
                                    <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden">
                                        <CardHeader className="bg-primary/10 pb-4">
                                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                                                <MessageSquare className="h-5 w-5" />
                                                Instructor Feedback
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-6 space-y-4">
                                            <p className="text-slate-800 leading-relaxed italic">
                                                "{submission.overallFeedback}"
                                            </p>

                                            {rubric && (
                                                <div className="space-y-3 pt-4">
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-primary/70">Rubric Breakdown</h4>
                                                    <div className="space-y-2">
                                                        {rubric.criteria.map(c => (
                                                            <div key={c.id} className="flex items-center justify-between text-sm py-2 border-b border-primary/10">
                                                                <span className="font-bold">{c.title}</span>
                                                                <span className="font-black">{(submission.rubricGrades?.[c.id]) || 0} / {c.maxPoints || (c as any).points || 0}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-premium-hover">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm font-bold">
                            <div className="flex justify-between items-center">
                                <span>Opens</span>
                                <span className="text-muted-foreground">{availableFrom.toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Due Date</span>
                                <span className="text-muted-foreground">{new Date(assignment.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Submission</span>
                                {submission ? (
                                    <Badge className="bg-green-500">Graded</Badge>
                                ) : !isOpen ? (
                                    <Badge variant="outline">Locked</Badge>
                                ) : (
                                    <Badge variant="outline">Missing</Badge>
                                )}
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Total Points</span>
                                    <span>{assignment.totalMarks || 0}</span>
                                </div>
                                {assignment.attachmentUrl ? (
                                    <div className="flex justify-between items-center">
                                        <span>Teacher File</span>
                                        <Badge variant="secondary">Attached</Badge>
                                    </div>
                                ) : null}
                                {isGraded && (
                                    <div className="flex justify-between items-center text-primary text-xl font-black pt-2">
                                        <span>Your Grade</span>
                                        <span>{submission.totalGrade || 0}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {rubric && !isGraded && (
                        <Card className="border-none shadow-premium italic">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Rubric Guide</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs space-y-3">
                                {rubric.criteria.map(c => (
                                    <div key={c.id}>
                                        <p className="font-black text-slate-800">{c.title}</p>
                                        <p className="text-muted-foreground">{c.description}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

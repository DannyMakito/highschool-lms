
import { useState, useRef } from "react";
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
    History
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
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
        // Simulate upload delay
        setTimeout(() => {
            submitWork({
                assignmentId: assignmentId || "",
                studentId: user?.id || "",
                studentName: user?.name || "Student",
                content: selectedFile ? selectedFile.name : content,
                fileType: selectedFile ? "pdf" : "text",
            });
            setIsSubmitting(false);
            toast.success("Assignment submitted successfully!");
        }, 1500);
    };

    if (!assignment) return <div>Assignment not found</div>;

    const isGraded = submission?.status === "graded" && submission.isReleased;

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-6 py-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Assignments
            </Button>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
                <Card className="md:col-span-2 border-none shadow-premium bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
                                {assignment.submissionType === "both" ? "PDF & Text" : assignment.submissionType}
                            </Badge>
                        </div>
                        <CardTitle className="text-3xl font-bold">{assignment.title}</CardTitle>
                        <div
                            className="prose prose-slate max-w-none dark:prose-invert text-slate-600 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: assignment.description || "Read the instructions carefully and submit your work before the deadline." }}
                        />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!submission ? (
                            <div className="space-y-4">
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
                                            disabled={isSubmitting}
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
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        />
                                        <div
                                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${selectedFile ? 'border-primary bg-primary/10' : 'border-primary/20 bg-primary/5 hover:border-primary/40'}`}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {selectedFile ? (
                                                <div className="flex flex-col items-center">
                                                    <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                                                    <p className="font-bold text-primary">{selectedFile.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-2">Click to change file</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-12 w-12 text-primary/40 group-hover:text-primary transition-colors mb-4" />
                                                    <p className="font-bold text-primary/60 group-hover:text-primary">Click to select or drag and drop your PDF file</p>
                                                    <p className="text-xs text-muted-foreground mt-2">Maximum file size: 10MB</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        className="flex-1 h-12 font-black text-lg gap-2"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || (assignment.submissionType === "text" && !content.trim())}
                                    >
                                        <Send className="h-5 w-5" />
                                        {isSubmitting ? "Submitting..." : "Submit Assignment"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-muted/30 border font-serif text-lg leading-relaxed whitespace-pre-wrap">
                                    {submission.content}
                                </div>

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
                                                                <span className="font-black">{submission.rubricGrades[c.id] || 0} / {c.maxPoints}</span>
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

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="border-none shadow-premium-hover">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm font-bold">
                            <div className="flex justify-between items-center">
                                <span>Due Date</span>
                                <span className="text-muted-foreground">{new Date(assignment.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Submission</span>
                                {submission ? (
                                    <Badge className="bg-green-500">Graded</Badge>
                                ) : (
                                    <Badge variant="outline">Missing</Badge>
                                )}
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Total Points</span>
                                    <span>{assignment.totalMarks}</span>
                                </div>
                                {isGraded && (
                                    <div className="flex justify-between items-center text-primary text-xl font-black pt-2">
                                        <span>Your Grade</span>
                                        <span>{submission.totalGrade}</span>
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

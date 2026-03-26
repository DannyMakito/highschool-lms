
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAssignments } from "@/hooks/useAssignments";
import type { Annotation } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ChevronLeft,
    CheckCircle,
    MessageSquare,
    Save,
    EyeOff,
    Maximize2,
    Highlighter,
    FileText,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SpeedGrader() {
    const { id: assignmentId } = useParams();
    const navigate = useNavigate();
    const {
        assignments,
        getAssignmentSubmissions,
        getRubric,
        updateGrade
    } = useAssignments();

    const assignment = assignments.find(a => a.id === assignmentId);
    const assignmentSubmissions = getAssignmentSubmissions(assignmentId || "");
    const rubric = getRubric(assignment?.rubricId);

    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
        assignmentSubmissions[0]?.id || null
    );

    const currentSubmission = assignmentSubmissions.find(s => s.id === selectedSubmissionId);

    // Grading State
    const [rubricGrades, setRubricGrades] = useState<Record<string, number>>(
        currentSubmission?.rubricGrades || {}
    );
    const [overallFeedback, setOverallFeedback] = useState(
        currentSubmission?.overallFeedback || ""
    );

    // Annotation State
    const [annotations, setAnnotations] = useState<Annotation[]>(
        currentSubmission?.annotations || []
    );
    const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [newAnnotationText, setNewAnnotationText] = useState("");
    const [selectedColor, setSelectedColor] = useState("bg-yellow-200 border-yellow-500");

    const MARKER_COLORS = [
        { name: 'Yellow', class: 'bg-yellow-200 border-yellow-500' },
        { name: 'Green', class: 'bg-green-200 border-green-500' },
        { name: 'Blue', class: 'bg-blue-200 border-blue-500' },
        { name: 'Red', class: 'bg-red-200 border-red-500' },
        { name: 'Purple', class: 'bg-purple-200 border-purple-500' },
    ];

    // Sync state when submission changes
    useMemo(() => {
        if (currentSubmission) {
            setRubricGrades(currentSubmission.rubricGrades || {});
            setOverallFeedback(currentSubmission.overallFeedback || "");
            setAnnotations(currentSubmission.annotations || []);
        }
    }, [selectedSubmissionId]);

    const totalGrade = useMemo(() => {
        return Object.values(rubricGrades).reduce((sum, val) => sum + val, 0);
    }, [rubricGrades]);

    const handleSaveGrade = (release: boolean = false) => {
        if (!selectedSubmissionId) return;

        updateGrade(selectedSubmissionId, {
            rubricGrades,
            overallFeedback,
            annotations,
            totalGrade,
            status: "graded",
            isReleased: release,
        });

        toast.success(release ? "Grade released to student" : "Grade saved as draft");
    };

    const handleAnnotateSelection = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            toast.error("Please select some text to annotate");
            return;
        }

        const range = sel.getRangeAt(0);
        const contentDiv = document.getElementById('submission-content');

        if (!contentDiv || !contentDiv.contains(range.commonAncestorContainer)) {
            toast.error("Please select text within the document");
            return;
        }

        const preRange = document.createRange();
        preRange.selectNodeContents(contentDiv);
        preRange.setEnd(range.startContainer, range.startOffset);

        const start = preRange.toString().length;
        const text = sel.toString();
        const end = start + text.length;

        setSelection({ start, end, text });
    };

    const handleQuickHighlight = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            toast.error("Please select some text to highlight");
            return;
        }

        const range = sel.getRangeAt(0);
        const contentDiv = document.getElementById('submission-content');

        if (!contentDiv || !contentDiv.contains(range.commonAncestorContainer)) {
            toast.error("Please select text within the document");
            return;
        }

        const preRange = document.createRange();
        preRange.selectNodeContents(contentDiv);
        preRange.setEnd(range.startContainer, range.startOffset);

        const start = preRange.toString().length;
        const text = sel.toString();
        const end = start + text.length;

        const newNote: Annotation = {
            id: crypto.randomUUID(),
            text: "",
            type: "highlight",
            color: selectedColor,
            range: { start, end },
            authorName: "Instructor",
            createdAt: new Date().toISOString()
        };

        setAnnotations([...annotations, newNote]);
        toast.success("Text highlighted");
    };

    const handleOpenAnnotator = () => {
        handleAnnotateSelection();
        if (window.getSelection()?.toString()) {
            setIsAnnotating(true);
        }
    };

    const HighlightedText = ({ text, annotations }: { text: string; annotations: Annotation[] }) => {
        if (!annotations || annotations.length === 0) return <>{text}</>;

        const sorted = [...annotations].sort((a, b) => a.range.start - b.range.start);
        const segments: (string | JSX.Element)[] = [];
        let lastIndex = 0;

        sorted.forEach((note) => {
            if (note.range.start > lastIndex) {
                segments.push(text.slice(lastIndex, note.range.start));
            }
            segments.push(
                <span
                    key={note.id}
                    className={cn(
                        note.color || "bg-yellow-200 border-yellow-500",
                        "border-b-2 font-bold transition-all relative group"
                    )}
                >
                    {text.slice(note.range.start, note.range.end)}
                    {note.type === "note" && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    )}
                </span>
            );
            lastIndex = note.range.end;
        });

        if (lastIndex < text.length) {
            segments.push(text.slice(lastIndex));
        }

        return <>{segments}</>;
    };

    const saveAnnotation = () => {
        if (!newAnnotationText.trim() || !selection) return;

        const newNote: Annotation = {
            id: crypto.randomUUID(),
            text: newAnnotationText,
            type: "note",
            color: selectedColor,
            range: { start: selection.start, end: selection.end },
            authorName: "Instructor",
            createdAt: new Date().toISOString()
        };

        setAnnotations([...annotations, newNote]);
        setNewAnnotationText("");
        setIsAnnotating(false);
        setSelection(null);
        toast.success("Comment added to document");
    };

    const deleteAnnotation = (id: string) => {
        setAnnotations(annotations.filter(a => a.id !== id));
    };

    if (!assignment) return <div>Assignment not found</div>;

    return (
        <div className="flex h-[calc(100vh-110px)] w-full overflow-hidden bg-background border rounded-xl shadow-inner">
            {/* LEFT: Submissions List */}
            <div className="w-40 border-r bg-muted/10 flex flex-col shrink-0">
                <div className="p-4 border-b bg-card">
                    <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Submissions</h2>
                    <p className="text-xs text-muted-foreground mt-1">{assignmentSubmissions.length} Students</p>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {assignmentSubmissions.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSubmissionId(s.id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg transition-all flex flex-col gap-1",
                                    selectedSubmissionId === s.id
                                        ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                                        : "hover:bg-muted bg-card/50"
                                )}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-sm truncate">{s.studentName}</span>
                                    {s.status === "graded" && (
                                        <CheckCircle className={cn("h-3 w-3", selectedSubmissionId === s.id ? "text-primary-foreground" : "text-green-500")} />
                                    )}
                                </div>
                                <span className={cn("text-[10px]", selectedSubmissionId === s.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                    {s.status === "graded" ? `Score: ${s.totalGrade}/${assignment.totalMarks}` : "Needs Grading"}
                                </span>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* CENTER: Document Viewer & Annotator */}
            <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
                <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <Separator orientation="vertical" className="h-4" />
                        <h1 className="font-bold text-slate-800">{assignment.title}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full border">
                            {MARKER_COLORS.map((c) => (
                                <button
                                    key={c.class}
                                    onClick={() => setSelectedColor(c.class)}
                                    className={cn(
                                        "h-6 w-6 rounded-full transition-all border-2",
                                        c.class.split(' ')[0],
                                        selectedColor === c.class ? "scale-110 border-slate-600 shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                    title={c.name}
                                />
                            ))}
                        </div>
                        <Separator orientation="vertical" className="h-6" />
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn("gap-2 text-[10px] font-black uppercase tracking-wider", selectedColor.split(' ')[0])}
                            onClick={handleQuickHighlight}
                        >
                            <Highlighter className="h-3.5 w-3.5" />
                            Highlight
                        </Button>
                        <Button
                            variant={isAnnotating ? "secondary" : "outline"}
                            size="sm"
                            className="gap-2 text-[10px] font-black uppercase tracking-wider"
                            onClick={handleOpenAnnotator}
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Add Comment
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 text-xs font-bold">
                            <Maximize2 className="h-3.5 w-3.5" />
                            Focus
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-slate-100 p-4">
                    <div className="max-w-4xl mx-auto flex gap-4 items-start justify-center">
                        {/* Document Card */}
                        <Card className="flex-1 max-w-xl min-h-[850px] shadow-lg border-none p-8 bg-white shrink-0">
                            {currentSubmission ? (
                                <div className="prose prose-slate max-w-none">
                                    <div className="flex items-center justify-between mb-8 pb-4 border-b italic text-muted-foreground">
                                        <span>Student: {currentSubmission.studentName}</span>
                                        <span>Submitted: {new Date(currentSubmission.submittedAt).toLocaleString()}</span>
                                    </div>
                                    <div
                                        id="submission-content"
                                        className="whitespace-pre-wrap leading-relaxed text-lg text-slate-700 font-serif"
                                    >
                                        <HighlightedText text={currentSubmission.content} annotations={annotations} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground w-full">
                                    <EyeOff className="h-12 w-12 mb-4 opacity-10" />
                                    <p>Select a submission to start grading</p>
                                </div>
                            )}
                        </Card>

                        {/* Annotation Gutter */}
                        <div className="w-48 shrink-0 space-y-3 pt-4 sticky top-0">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Annotations</h3>
                            {isAnnotating && (
                                <div className="p-4 bg-primary/10 border-2 border-primary rounded-xl shadow-xl animate-in fade-in slide-in-from-top-4">
                                    <div className="mb-2">
                                        <span className="text-[10px] font-black uppercase text-primary">Selected Text</span>
                                        <p className="text-xs italic line-clamp-2">"{selection?.text}"</p>
                                    </div>
                                    <Textarea
                                        autoFocus
                                        placeholder="Add your comment..."
                                        className="text-xs min-h-[80px] mb-2"
                                        value={newAnnotationText}
                                        onChange={(e) => setNewAnnotationText(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1 h-7 text-[10px]" onClick={saveAnnotation}>Save</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setIsAnnotating(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}
                            {annotations.filter(n => n.type === "note").map((note) => (
                                <div
                                    key={note.id}
                                    className={cn(
                                        "p-3 border-l-4 rounded-r-lg shadow-sm group relative animate-in fade-in slide-in-from-top-2",
                                        note.color?.replace('bg-', 'bg-opacity-40 bg-') || "bg-yellow-50 border-yellow-400"
                                    )}
                                    style={{ borderLeftColor: note.color?.split(' ')[1].replace('border-', '') }}
                                >
                                    <button
                                        onClick={() => deleteAnnotation(note.id)}
                                        className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
                                    >
                                        ×
                                    </button>
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className="h-3 w-3 text-yellow-600" />
                                        <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-tighter">{note.authorName}</span>
                                    </div>
                                    <p className="text-[11px] text-yellow-900 leading-snug">{note.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Grading Panel */}
            <div className="w-72 border-l bg-card flex flex-col shrink-0">
                <header className="h-14 border-b flex items-center px-4 justify-between bg-white shrink-0">
                    <h2 className="font-bold text-sm">Grading</h2>
                    <Badge variant="outline" className="font-black">
                        {totalGrade} / {assignment.totalMarks}
                    </Badge>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-4 space-y-6">
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    Rubric Scoring
                                </h3>
                                <Badge variant="secondary" className="text-[10px] h-5">
                                    {rubric?.criteria.length || 0} Criteria
                                </Badge>
                            </div>
                            {rubric ? (
                                <div className="space-y-3 pb-2">
                                    {rubric.criteria.map((c) => (
                                        <div key={c.id} className="space-y-3 p-4 rounded-xl bg-slate-50 border-2 border-slate-100 hover:border-primary/20 transition-all">
                                            <div className="space-y-1">
                                                <Label className="font-bold text-xs leading-tight text-slate-800">{c.title}</Label>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">{c.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs font-black flex-1"
                                                    value={rubricGrades[c.id] || 0}
                                                    max={c.maxPoints}
                                                    onChange={(e) => setRubricGrades({
                                                        ...rubricGrades,
                                                        [c.id]: Math.min(parseInt(e.target.value) || 0, c.maxPoints)
                                                    })}
                                                />
                                                <span className="text-[10px] font-black opacity-40 uppercase">/ {c.maxPoints}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[10px] p-6 text-center border-2 border-dashed rounded-2xl text-muted-foreground bg-muted/20">
                                    No rubric attached to this assignment.
                                </div>
                            )}
                        </section>

                        <Separator />

                        <section className="space-y-3 pb-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                Summary Feedback
                            </h3>
                            <Textarea
                                className="min-h-[120px] text-xs leading-relaxed italic bg-slate-50 border-2 border-slate-100"
                                placeholder="Write your summary observation..."
                                value={overallFeedback}
                                onChange={(e) => setOverallFeedback(e.target.value)}
                            />
                        </section>
                    </div>
                </div>

                <footer className="p-4 border-t bg-muted/20 space-y-2 shrink-0">
                    <Button
                        onClick={() => handleSaveGrade(false)}
                        variant="ghost"
                        className="w-full font-bold gap-2 text-xs h-9"
                    >
                        <Save className="h-3.5 w-3.5" />
                        Save Draft
                    </Button>
                    <Button
                        onClick={() => handleSaveGrade(true)}
                        className="w-full font-black gap-2 text-xs h-9 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                    >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Submit & Release
                    </Button>
                </footer>
            </div>
        </div>
    );
}

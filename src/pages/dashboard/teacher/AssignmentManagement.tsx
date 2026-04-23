import { useMemo, useRef, useState } from "react";
import RichTextEditor from "@/components/shared/TinyMCEEditor";
import { useAssignments } from "@/hooks/useAssignments";
import { useSubjects } from "@/hooks/useSubjects";
import { useTeacherTracking } from "@/hooks/useTeacherTracking";
import { useAuth } from "@/context/AuthContext";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Users, Calendar as CalendarIcon, Send, Trash, PlusCircle, LayoutList, ArrowLeft, PencilLine, Scale, Clock3, Upload, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { AssessmentCategory, AssessmentPeriod, Assignment, Rubric } from "@/types";
import { removeStorageFile, uploadFileWithProgress } from "@/lib/storage";

type AssignmentFormState = {
    title: string;
    description: string;
    subjectId: string;
    totalMarks: number;
    submissionType: "pdf" | "text" | "both";
    isGroup: boolean;
    durationDays: number;
    availableFrom: string;
    dueDate: string;
    rubricId: string;
    assessmentCategory: AssessmentCategory;
    assessmentPeriod: AssessmentPeriod;
    contributionWeight: number;
    attachmentUrl: string;
    attachmentType: "pdf" | "file" | null;
    attachmentFilePath: string | null;
    attachmentFileName: string | null;
    attachmentMimeType: string | null;
};

type RubricEditorState = {
    id?: string;
    title: string;
    criteria: Array<{ id: string; title: string; description: string; maxPoints: number }>;
};

const createEmptyRubric = (): RubricEditorState => ({
    title: "",
    criteria: [{ id: crypto.randomUUID(), title: "", description: "", maxPoints: 4 }]
});

const createDefaultAssignmentState = (): AssignmentFormState => {
    const startDate = new Date();
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return {
        title: "",
        description: "",
        subjectId: "",
        totalMarks: 100,
        submissionType: "both",
        isGroup: false,
        durationDays: 7,
        availableFrom: format(startDate, "yyyy-MM-dd"),
        dueDate: format(dueDate, "yyyy-MM-dd"),
        rubricId: "",
        assessmentCategory: "assignment",
        assessmentPeriod: "term",
        contributionWeight: 0,
        attachmentUrl: "",
        attachmentType: null,
        attachmentFilePath: null,
        attachmentFileName: null,
        attachmentMimeType: null,
    };
};

export default function AssignmentManagement() {
    const { user } = useAuth();
    const { trackAssignmentCreated } = useTeacherTracking();
    const { teachers } = useSchoolData();
    const {
        assignments: allAssignments,
        rubrics,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        notifyNonSubmitters,
        addRubric,
        updateRubric,
    } = useAssignments();
    const { subjects: allSubjects } = useSubjects();
    const navigate = useNavigate();

    const teacherProfile = useMemo(() => teachers.find(t => t.id === user?.id), [teachers, user?.id]);

    const subjects = useMemo(() => {
        if (!teacherProfile) return [];
        if (teacherProfile.subjects.length === 0) {
            return allSubjects;
        }
        return allSubjects.filter(s => teacherProfile.subjects.includes(s.id));
    }, [allSubjects, teacherProfile]);

    const assignments = useMemo(() => {
        const subjectIds = subjects.map(s => s.id);
        return allAssignments.filter(a => subjectIds.includes(a.subjectId));
    }, [allAssignments, subjects]);

    const [searchTerm, setSearchTerm] = useState("");
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(createDefaultAssignmentState());
    const [isCustomRubricMode, setIsCustomRubricMode] = useState(false);
    const [rubricEditor, setRubricEditor] = useState<RubricEditorState>(createEmptyRubric());
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [attachmentUploadProgress, setAttachmentUploadProgress] = useState(0);
    const attachmentInputRef = useRef<HTMLInputElement | null>(null);

    const filteredAssignments = assignments.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedWeightSummary = useMemo(() => {
        return subjects.map(subject => {
            const subjectAssignments = assignments.filter(a => a.subjectId === subject.id);
            return {
                subjectId: subject.id,
                subjectName: subject.name,
                termWeight: subjectAssignments.filter(a => a.assessmentPeriod === "term").reduce((sum, item) => sum + (item.contributionWeight || 0), 0),
                yearWeight: subjectAssignments.filter(a => a.assessmentPeriod === "year").reduce((sum, item) => sum + (item.contributionWeight || 0), 0),
            };
        });
    }, [assignments, subjects]);

    const openCreateEditor = () => {
        setEditingAssignmentId(null);
        setAssignmentForm(createDefaultAssignmentState());
        setIsCustomRubricMode(false);
        setRubricEditor(createEmptyRubric());
        setIsEditorOpen(true);
    };

    const openEditEditor = (assignment: Assignment) => {
        setEditingAssignmentId(assignment.id);
        setAssignmentForm({
            title: assignment.title,
            description: assignment.description,
            subjectId: assignment.subjectId,
            totalMarks: assignment.totalMarks,
            submissionType: assignment.submissionType,
            isGroup: assignment.isGroup,
            durationDays: assignment.durationDays,
            availableFrom: assignment.availableFrom || format(new Date(assignment.createdAt || Date.now()), "yyyy-MM-dd"),
            dueDate: assignment.dueDate,
            rubricId: assignment.rubricId || "",
            assessmentCategory: assignment.assessmentCategory || "assignment",
            assessmentPeriod: assignment.assessmentPeriod || "term",
            contributionWeight: assignment.contributionWeight || 0,
            attachmentUrl: assignment.attachmentUrl || "",
            attachmentType: assignment.attachmentType || null,
            attachmentFilePath: assignment.attachmentFilePath || null,
            attachmentFileName: assignment.attachmentFileName || null,
            attachmentMimeType: assignment.attachmentMimeType || null,
        });
        const attachedRubric = rubrics.find(r => r.id === assignment.rubricId);
        if (attachedRubric) {
            setIsCustomRubricMode(true);
            setRubricEditor({
                id: attachedRubric.id,
                title: attachedRubric.title,
                criteria: attachedRubric.criteria.map(c => ({
                    id: c.id || crypto.randomUUID(),
                    title: c.title,
                    description: c.description,
                    maxPoints: c.maxPoints,
                }))
            });
        } else {
            setIsCustomRubricMode(false);
            setRubricEditor(createEmptyRubric());
        }
        setIsEditorOpen(true);
    };

    const removeAssignmentAttachment = async (filePath?: string | null) => {
        if (!filePath) return;

        try {
            await removeStorageFile("assignment-files", filePath);
        } catch (error) {
            console.error("Failed to remove assignment attachment", error);
        }
    };

    const handleAttachmentSelected = async (file?: File | null) => {
        if (!file || !assignmentForm.subjectId || !user?.id) {
            toast.error("Choose a subject before uploading the assignment file.");
            return;
        }

        const maxSizeBytes = 25 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            toast.error("Assignment files must be 25MB or smaller");
            return;
        }

        setIsUploadingAttachment(true);
        setAttachmentUploadProgress(0);

        try {
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `${assignmentForm.subjectId}/${user.id}/${Date.now()}_${sanitizedName}`;
            const publicUrl = await uploadFileWithProgress({
                bucket: "assignment-files",
                filePath,
                file,
                onProgress: setAttachmentUploadProgress,
            });

            setAssignmentForm((prev) => ({
                ...prev,
                attachmentUrl: publicUrl,
                attachmentType: file.type === "application/pdf" ? "pdf" : "file",
                attachmentFilePath: filePath,
                attachmentFileName: file.name,
                attachmentMimeType: file.type || "application/octet-stream",
            }));

            toast.success("Assignment file uploaded");
        } catch (error) {
            console.error("Failed to upload assignment attachment", error);
            toast.error("Could not upload the assignment file");
        } finally {
            setIsUploadingAttachment(false);
            setAttachmentUploadProgress(0);
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = "";
            }
        }
    };

    const clearAttachment = async () => {
        if (assignmentForm.attachmentFilePath) {
            const editingAssignment = assignments.find((item) => item.id === editingAssignmentId);
            if (assignmentForm.attachmentFilePath !== editingAssignment?.attachmentFilePath) {
                await removeAssignmentAttachment(assignmentForm.attachmentFilePath);
            }
        }

        setAssignmentForm((prev) => ({
            ...prev,
            attachmentUrl: "",
            attachmentType: null,
            attachmentFilePath: null,
            attachmentFileName: null,
            attachmentMimeType: null,
        }));
    };

    const addCriterion = () => {
        setRubricEditor(prev => ({
            ...prev,
            criteria: [...prev.criteria, { id: crypto.randomUUID(), title: "", description: "", maxPoints: 4 }]
        }));
    };

    const removeCriterion = (id: string) => {
        if (rubricEditor.criteria.length <= 1) return;
        setRubricEditor(prev => ({
            ...prev,
            criteria: prev.criteria.filter(c => c.id !== id)
        }));
    };

    const updateCriterion = (id: string, field: "title" | "description" | "maxPoints", value: string | number) => {
        setRubricEditor(prev => ({
            ...prev,
            criteria: prev.criteria.map(c => c.id === id ? { ...c, [field]: value } : c)
        }));
    };

    const saveRubricIfNeeded = async () => {
        if (!isCustomRubricMode) {
            return assignmentForm.rubricId || "default-essay-rubric";
        }
        if (!rubricEditor.title || rubricEditor.criteria.some(c => !c.title || c.maxPoints <= 0)) {
            throw new Error("Please complete the rubric before saving.");
        }
        const rubricPayload: Partial<Rubric> = {
            title: rubricEditor.title,
            criteria: rubricEditor.criteria.map((criterion, index) => ({
                id: criterion.id,
                title: criterion.title,
                description: criterion.description,
                maxPoints: criterion.maxPoints,
                order: index + 1,
            }))
        };
        if (rubricEditor.id) {
            const updated = await updateRubric(rubricEditor.id, rubricPayload);
            return updated.id;
        }
        const created = await addRubric(rubricPayload);
        setRubricEditor(prev => ({ ...prev, id: created.id }));
        return created.id;
    };

    const handleSave = async () => {
        if (!assignmentForm.title || !assignmentForm.subjectId) {
            toast.error("Please fill in the assessment title and subject.");
            return;
        }
        if (isUploadingAttachment) {
            toast.error("Please wait for the file upload to finish.");
            return;
        }
        try {
            const rubricId = await saveRubricIfNeeded();
            const existingAssignment = editingAssignmentId
                ? assignments.find((item) => item.id === editingAssignmentId)
                : null;
            const payload: Partial<Assignment> = {
                ...assignmentForm,
                rubricId,
                status: "published",
            };
            if (editingAssignmentId) {
                await updateAssignment(editingAssignmentId, payload);
                if (
                    existingAssignment?.attachmentFilePath &&
                    existingAssignment.attachmentFilePath !== assignmentForm.attachmentFilePath
                ) {
                    await removeAssignmentAttachment(existingAssignment.attachmentFilePath);
                }
                toast.success("Assessment updated successfully");
            } else {
                const createdAssignment = await addAssignment(payload);
                if (createdAssignment?.id) {
                    void trackAssignmentCreated(createdAssignment.id);
                }
                toast.success("Assessment created successfully");
            }
            setIsEditorOpen(false);
            setEditingAssignmentId(null);
            setAssignmentForm(createDefaultAssignmentState());
            setRubricEditor(createEmptyRubric());
            setIsCustomRubricMode(false);
        } catch (error: any) {
            toast.error(error?.message || "Could not save the assessment.");
        }
    };

    return (
        <div className="space-y-6">
            {isEditorOpen ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)} className="font-bold">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Exit Editor
                            </Button>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">
                                    {editingAssignmentId ? "Edit Assessment" : "Create Assessment"}
                                </h1>
                                <p className="text-xs text-muted-foreground">Configure access, weighting, and a rubric that matches this task.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
                            <Button className="bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/20" onClick={handleSave}>
                                <Send className="mr-2 h-4 w-4" />
                                {editingAssignmentId ? "Save Changes" : "Publish Now"}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-20">
                        <div className="lg:col-span-3 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-xs uppercase font-black tracking-widest text-muted-foreground/60">Assessment Name</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Poetry Analysis Test 1"
                                    className="text-2xl font-bold h-auto py-4 px-6 border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:opacity-30"
                                    value={assignmentForm.title}
                                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                                />
                                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground/60">Instructions & Description</Label>
                                <RichTextEditor
                                    value={assignmentForm.description}
                                    onChange={(content) => setAssignmentForm(prev => ({ ...prev, description: content }))}
                                    placeholder="Write detailed instructions for your students here..."
                                    height={500}
                                />
                            </div>

                            <div className="space-y-2 pt-4">
                                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    Rubric
                                </Label>
                                <Card className="border-muted/20 bg-muted/10 backdrop-blur-sm">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Rubric Library</Label>
                                                <Select
                                                    disabled={isCustomRubricMode}
                                                    value={assignmentForm.rubricId}
                                                    onValueChange={(v) => setAssignmentForm(prev => ({ ...prev, rubricId: v }))}
                                                >
                                                    <SelectTrigger className="bg-background/50">
                                                        <SelectValue placeholder="Existing rubric" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="default-essay-rubric">Default Essay Rubric</SelectItem>
                                                        {rubrics.map(r => (
                                                            <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    variant={isCustomRubricMode ? "secondary" : "outline"}
                                                    size="sm"
                                                    className="w-full font-bold text-xs h-10"
                                                    onClick={() => setIsCustomRubricMode(prev => !prev)}
                                                >
                                                    {isCustomRubricMode ? "Use Library Rubric" : "Create / Edit Custom Rubric"}
                                                </Button>
                                            </div>
                                        </div>

                                        {isCustomRubricMode && (
                                            <div className="mt-6 space-y-4 border p-6 rounded-xl bg-background/50 animate-in fade-in zoom-in-95">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="rubricTitle" className="text-xs uppercase font-black text-primary">Rubric Name</Label>
                                                    <Input
                                                        id="rubricTitle"
                                                        placeholder="e.g. Poetry Interpretation Rubric"
                                                        className="font-bold border-primary/20"
                                                        value={rubricEditor.title}
                                                        onChange={(e) => setRubricEditor(prev => ({ ...prev, title: e.target.value }))}
                                                    />
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Teachers can define any number of criteria here. Use rubric scales like <span className="font-bold">4</span> or <span className="font-bold">5</span>.
                                                    </p>
                                                </div>

                                                <div className="space-y-4">
                                                    <Label className="text-xs uppercase font-black text-muted-foreground flex items-center justify-between">
                                                        Assessment Criteria
                                                        <span className="text-primary bg-primary/10 px-3 py-1 rounded-full">
                                                            {rubricEditor.criteria.length} criteria
                                                        </span>
                                                    </Label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {rubricEditor.criteria.map((criterion) => (
                                                            <div key={criterion.id} className="grid gap-3 p-4 border rounded-xl bg-card relative group hover:border-primary/30 transition-all">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => removeCriterion(criterion.id)}
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <Input
                                                                            placeholder="Criterion Title"
                                                                            className="h-9 font-bold"
                                                                            value={criterion.title}
                                                                            onChange={(e) => updateCriterion(criterion.id, "title", e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="w-24">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="/4"
                                                                            className="h-9 text-center font-bold"
                                                                            value={criterion.maxPoints || ""}
                                                                            onChange={(e) => updateCriterion(criterion.id, "maxPoints", Math.max(1, parseInt(e.target.value) || 0))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <textarea
                                                                    placeholder="Describe what strong performance looks like for this criterion..."
                                                                    className="w-full p-3 text-sm border rounded-lg bg-muted/5 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                                    value={criterion.description}
                                                                    onChange={(e) => updateCriterion(criterion.id, "description", e.target.value)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full border-2 border-dashed border-muted-foreground/20 h-12 hover:border-primary/50 hover:bg-primary/5 rounded-xl transition-all"
                                                        onClick={addCriterion}
                                                    >
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Add New Criterion
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <Card className="border-muted/20 bg-muted/10 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-muted/20">
                                    <div className="flex items-center gap-2 text-primary">
                                        <LayoutList className="h-4 w-4" />
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">Assessment Settings</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-muted-foreground">Subject & Grade</Label>
                                        <Select
                                            value={assignmentForm.subjectId}
                                            onValueChange={(v) => setAssignmentForm(prev => ({ ...prev, subjectId: v }))}
                                        >
                                            <SelectTrigger className="bg-background/50">
                                                <SelectValue placeholder="Select a subject" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subjects.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name} (Grade {s.gradeTier})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-muted-foreground">Assessment Type</Label>
                                            <Select value={assignmentForm.assessmentCategory} onValueChange={(v: AssessmentCategory) => setAssignmentForm(prev => ({ ...prev, assessmentCategory: v }))}>
                                                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="assignment">Assignment</SelectItem>
                                                    <SelectItem value="test">Test</SelectItem>
                                                    <SelectItem value="quiz">Quiz-like Task</SelectItem>
                                                    <SelectItem value="project">Project</SelectItem>
                                                    <SelectItem value="exam">Exam</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-muted-foreground">Reporting Period</Label>
                                            <Select value={assignmentForm.assessmentPeriod} onValueChange={(v: AssessmentPeriod) => setAssignmentForm(prev => ({ ...prev, assessmentPeriod: v }))}>
                                                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="term">Term Grade</SelectItem>
                                                    <SelectItem value="year">Year Grade</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="marks" className="text-xs font-bold text-muted-foreground">Total Marks</Label>
                                            <Input
                                                id="marks"
                                                type="number"
                                                className="bg-background/50"
                                                value={assignmentForm.totalMarks}
                                                onChange={(e) => setAssignmentForm(prev => ({ ...prev, totalMarks: parseInt(e.target.value) || 0 }))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                                <Scale className="h-3.5 w-3.5" />
                                                Grade Weight %
                                            </Label>
                                            <Input
                                                type="number"
                                                className="bg-background/50"
                                                min={0}
                                                max={100}
                                                value={assignmentForm.contributionWeight}
                                                onChange={(e) => setAssignmentForm(prev => ({ ...prev, contributionWeight: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-muted-foreground">Submission Type</Label>
                                        <Select
                                            value={assignmentForm.submissionType}
                                            onValueChange={(v: "pdf" | "text" | "both") => setAssignmentForm(prev => ({ ...prev, submissionType: v }))}
                                        >
                                            <SelectTrigger className="bg-background/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Online Editor Only</SelectItem>
                                                <SelectItem value="pdf">PDF File Upload</SelectItem>
                                                <SelectItem value="both">Both (Text + File)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-3">
                                        <Label className="text-xs font-bold text-muted-foreground">Assignment File</Label>
                                        <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                                                {isUploadingAttachment ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                                            </div>
                                            <p className="text-sm font-bold text-slate-900">
                                                {isUploadingAttachment ? `Uploading file... ${attachmentUploadProgress}%` : "Upload a worksheet, memo, or PDF brief"}
                                            </p>
                                            <p className="mt-1 text-[10px] text-slate-500">PDF and classroom files up to 25MB</p>
                                            {isUploadingAttachment ? (
                                                <div className="mt-3 space-y-2">
                                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                                        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${attachmentUploadProgress}%` }} />
                                                    </div>
                                                </div>
                                            ) : null}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="mt-4 font-bold text-primary"
                                                disabled={isUploadingAttachment}
                                                onClick={() => attachmentInputRef.current?.click()}
                                            >
                                                Browse Files
                                            </Button>
                                            <input
                                                ref={attachmentInputRef}
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                                                onChange={(e) => void handleAttachmentSelected(e.target.files?.[0] || null)}
                                            />
                                        </div>

                                        {assignmentForm.attachmentUrl ? (
                                            <div className="rounded-2xl border bg-background/70 p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold">{assignmentForm.attachmentFileName || "Attached file"}</p>
                                                        <p className="truncate text-[11px] text-muted-foreground">{assignmentForm.attachmentUrl}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a href={assignmentForm.attachmentUrl} target="_blank" rel="noreferrer">
                                                            <Button type="button" variant="ghost" size="icon">
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </a>
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => void clearAttachment()}>
                                                            Clear
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                                <Clock3 className="h-3.5 w-3.5" />
                                                Open From
                                            </Label>
                                            <Input
                                                type="date"
                                                className="bg-background/50"
                                                value={assignmentForm.availableFrom}
                                                onChange={(e) => setAssignmentForm(prev => ({ ...prev, availableFrom: e.target.value }))}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-muted-foreground">Due Date</Label>
                                            <Input
                                                type="date"
                                                className="bg-background/50"
                                                value={assignmentForm.dueDate}
                                                onChange={(e) => setAssignmentForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2 pt-2">
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-primary/10 bg-primary/5">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-bold">Group Assignment</Label>
                                                <p className="text-[10px] text-primary/60 font-medium">Allow team submissions</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={assignmentForm.isGroup}
                                                onChange={(e) => setAssignmentForm(prev => ({ ...prev, isGroup: e.target.checked }))}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Assessment Management</h1>
                            <p className="text-muted-foreground">Create tests, assignments, and weighted assessments with editable rubrics.</p>
                        </div>
                        <Button className="bg-primary hover:bg-primary/90" onClick={openCreateEditor}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Assessment
                        </Button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
                        <Card className="border-muted/20 bg-muted/10">
                            <CardHeader>
                                <CardTitle className="text-base font-black">Weight Overview</CardTitle>
                                <CardDescription>Term and year contribution currently configured per subject.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {groupedWeightSummary.map(item => (
                                    <div key={item.subjectId} className="rounded-xl border bg-background/70 p-4">
                                        <p className="font-bold">{item.subjectName}</p>
                                        <div className="mt-2 flex gap-2 text-xs">
                                            <Badge variant="secondary">Term: {item.termWeight}%</Badge>
                                            <Badge variant="outline">Year: {item.yearWeight}%</Badge>
                                        </div>
                                    </div>
                                ))}
                                {groupedWeightSummary.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No teacher subjects found yet.</p>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search assessments..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {filteredAssignments.map((assignment) => {
                                    const subject = subjects.find(s => s.id === assignment.subjectId);
                                    return (
                                        <Card key={assignment.id} className="group hover:border-primary/50 transition-all cursor-pointer overflow-hidden border-muted/20 bg-card/50 backdrop-blur-sm">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                                        {subject?.name || "Unknown Subject"}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest">
                                                        {assignment.assessmentCategory || assignment.submissionType}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                                                    {assignment.title}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-1">
                                                    <CalendarIcon className="h-3 w-3" />
                                                    Opens: {format(new Date(assignment.availableFrom || assignment.createdAt), "PPP")}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pb-4 space-y-3">
                                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {assignment.totalMarks} Marks
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {assignment.isGroup ? "Group" : "Individual"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <Badge variant="secondary">{assignment.assessmentPeriod || "term"} grade</Badge>
                                                    <Badge variant="outline">{assignment.contributionWeight || 0}% contribution</Badge>
                                                    {assignment.attachmentUrl ? <Badge variant="outline">Has file</Badge> : null}
                                                </div>
                                            </CardContent>
                                            <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                                                <Button className="flex-1 font-bold" onClick={() => navigate(`/teacher/assignments/${assignment.id}/grade`)}>
                                                    Grade
                                                </Button>
                                                <Button variant="outline" size="icon" title="Edit assessment" onClick={(e) => { e.stopPropagation(); openEditEditor(assignment); }}>
                                                    <PencilLine className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" title="Notify students who haven't submitted" onClick={(e) => { e.stopPropagation(); notifyNonSubmitters(assignment.id); }}>
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="icon" title="Delete assessment" onClick={async (e) => { e.stopPropagation(); await deleteAssignment(assignment.id); toast.success("Assessment deleted"); }}>
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}

                                {filteredAssignments.length === 0 && (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                                        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                                        <p className="text-muted-foreground">No assessments found. Start by creating your first one.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

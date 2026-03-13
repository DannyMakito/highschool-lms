
import { useState } from "react";
import RichTextEditor from "@/components/shared/TinyMCEEditor";
import { useAssignments } from "@/hooks/useAssignments";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Users, Clock, Calendar as CalendarIcon, MoreVertical, Send, Trash, PlusCircle, LayoutList, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { useMemo } from "react";

export default function AssignmentManagement() {
    const { user } = useAuth();
    const { teachers } = useSchoolData();
    const { assignments: allAssignments, rubrics, addAssignment, deleteAssignment, notifyNonSubmitters, addRubric } = useAssignments();
    const { subjects: allSubjects } = useSubjects();
    const navigate = useNavigate();

    const teacherProfile = useMemo(() => teachers.find(t => t.id === user?.id), [teachers, user?.id]);

    const subjects = useMemo(() => {
        if (!teacherProfile) return [];
        return allSubjects.filter(s => teacherProfile.subjects.includes(s.id));
    }, [allSubjects, teacherProfile]);

    const assignments = useMemo(() => {
        const subjectIds = subjects.map(s => s.id);
        return allAssignments.filter(a => subjectIds.includes(a.subjectId));
    }, [allAssignments, subjects]);

    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const [newAssignment, setNewAssignment] = useState({
        title: "",
        description: "",
        subjectId: "",
        totalMarks: 100,
        submissionType: "both" as "pdf" | "text" | "both",
        isGroup: false,
        durationDays: 7,
        dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        rubricId: "",
    });

    const [isCreatingCustomRubric, setIsCreatingCustomRubric] = useState(false);
    const [newRubric, setNewRubric] = useState({
        title: "",
        criteria: [
            { id: crypto.randomUUID(), title: "", description: "", maxPoints: 25 },
        ]
    });

    const handleCreate = () => {
        if (!newAssignment.title || !newAssignment.subjectId) {
            toast.error("Please fill in title and subject");
            return;
        }

        let finalRubricId = newAssignment.rubricId;

        if (isCreatingCustomRubric) {
            if (!newRubric.title || newRubric.criteria.some(c => !c.title || c.maxPoints <= 0)) {
                toast.error("Please fill in all rubric details correctly");
                return;
            }
            const createdRubric = addRubric(newRubric);
            finalRubricId = createdRubric.id;
        }

        addAssignment({
            ...newAssignment,
            rubricId: finalRubricId || "default-essay-rubric",
            status: "published",
        });

        setIsCreating(false);
        setNewAssignment({
            title: "",
            description: "",
            subjectId: "",
            totalMarks: 100,
            submissionType: "both",
            isGroup: false,
            durationDays: 7,
            dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
            rubricId: "",
        });
        setIsCreatingCustomRubric(false);
        setNewRubric({
            title: "",
            criteria: [{ id: crypto.randomUUID(), title: "", description: "", maxPoints: 25 }]
        });
        toast.success("Assignment created successfully");
    };

    const addCriterion = () => {
        setNewRubric({
            ...newRubric,
            criteria: [...newRubric.criteria, { id: crypto.randomUUID(), title: "", description: "", maxPoints: 0 }]
        });
    };

    const removeCriterion = (id: string) => {
        if (newRubric.criteria.length <= 1) return;
        setNewRubric({
            ...newRubric,
            criteria: newRubric.criteria.filter(c => c.id !== id)
        });
    };

    const updateCriterion = (id: string, field: string, value: any) => {
        setNewRubric({
            ...newRubric,
            criteria: newRubric.criteria.map(c => c.id === id ? { ...c, [field]: value } : c)
        });
    };

    const filteredAssignments = assignments.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {isCreating ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="font-bold">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Exit Editor
                            </Button>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">Create Assignment</h1>
                                <p className="text-xs text-muted-foreground">Draft your assessment and grading standards.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setIsCreating(false)}>Save Draft</Button>
                            <Button className="bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/20" onClick={handleCreate}>
                                <Send className="mr-2 h-4 w-4" />
                                Publish Now
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-20">
                        {/* Main Editor Area */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-xs uppercase font-black tracking-widest text-muted-foreground/60">Assignment Name</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Analysis of the Cold War and its Global Impact"
                                    className="text-2xl font-bold h-auto py-4 px-6 border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:opacity-30"
                                    value={newAssignment.title}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                />
                                <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground/60">Instructions & Description</Label>
                                <RichTextEditor
                                    value={newAssignment.description}
                                    onChange={(content) => setNewAssignment({ ...newAssignment, description: content })}
                                    placeholder="Write detailed instructions for your students here..."
                                    height={500}
                                />
                            </div>

                            <div className="space-y-2 pt-4">
                                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    Grading Rubric
                                </Label>
                                <Card className="border-muted/20 bg-muted/10 backdrop-blur-sm">
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Rubric Library</Label>
                                                <Select
                                                    disabled={isCreatingCustomRubric}
                                                    value={newAssignment.rubricId}
                                                    onValueChange={(v) => setNewAssignment({ ...newAssignment, rubricId: v })}
                                                >
                                                    <SelectTrigger className="bg-background/50">
                                                        <SelectValue placeholder="Existing rubric" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="default-essay-rubric">Default Essay Rubric</SelectItem>
                                                        {rubrics && rubrics.filter(r => r.id !== "default-essay-rubric").map(r => (
                                                            <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    variant={isCreatingCustomRubric ? "secondary" : "outline"}
                                                    size="sm"
                                                    className="w-full font-bold text-xs h-10"
                                                    onClick={() => setIsCreatingCustomRubric(!isCreatingCustomRubric)}
                                                >
                                                    {isCreatingCustomRubric ? "Exit Rubric Builder" : "Design Custom Rubric"}
                                                </Button>
                                            </div>
                                        </div>

                                        {isCreatingCustomRubric && (
                                            <div className="mt-6 space-y-4 border p-6 rounded-xl bg-background/50 animate-in fade-in zoom-in-95">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="rubricTitle" className="text-xs uppercase font-black text-primary">New Rubric Name</Label>
                                                    <Input
                                                        id="rubricTitle"
                                                        placeholder="e.g. History Critical Analysis Rubric"
                                                        className="font-bold border-primary/20"
                                                        value={newRubric.title}
                                                        onChange={(e) => setNewRubric({ ...newRubric, title: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <Label className="text-xs uppercase font-black text-muted-foreground flex items-center justify-between">
                                                        Assessment Criteria
                                                        <span className="text-primary bg-primary/10 px-3 py-1 rounded-full">{newRubric.criteria.reduce((a, b) => a + (b.maxPoints || 0), 0)} pts total</span>
                                                    </Label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {newRubric.criteria.map((criterion) => (
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
                                                                    <div className="w-20">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Pts"
                                                                            className="h-9 text-center font-bold"
                                                                            value={criterion.maxPoints || ""}
                                                                            onChange={(e) => updateCriterion(criterion.id, "maxPoints", parseInt(e.target.value) || 0)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <textarea
                                                                    placeholder="Describe what a student needs to do to achieve full points for this criterion..."
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

                        {/* Settings Sidebar */}
                        <div className="space-y-6">
                            <Card className="border-muted/20 bg-muted/10 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-muted/20">
                                    <div className="flex items-center gap-2 text-primary">
                                        <LayoutList className="h-4 w-4" />
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">Assignment Settings</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="subject" className="text-xs font-bold text-muted-foreground">Subject & Grade</Label>
                                        <Select
                                            value={newAssignment.subjectId}
                                            onValueChange={(v) => setNewAssignment({ ...newAssignment, subjectId: v })}
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

                                    <div className="grid gap-2">
                                        <Label htmlFor="marks" className="text-xs font-bold text-muted-foreground">Total Points</Label>
                                        <Input
                                            id="marks"
                                            type="number"
                                            className="bg-background/50"
                                            value={newAssignment.totalMarks}
                                            onChange={(e) => setNewAssignment({ ...newAssignment, totalMarks: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-muted-foreground">Submission Type</Label>
                                        <Select
                                            value={newAssignment.submissionType}
                                            onValueChange={(v: any) => setNewAssignment({ ...newAssignment, submissionType: v })}
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

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-muted-foreground">Due Date</Label>
                                        <Input
                                            type="date"
                                            className="bg-background/50"
                                            value={newAssignment.dueDate}
                                            onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                        />
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
                                                checked={newAssignment.isGroup}
                                                onChange={(e) => setNewAssignment({ ...newAssignment, isGroup: e.target.checked })}
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
                            <h1 className="text-3xl font-bold tracking-tight">Assignment Management</h1>
                            <p className="text-muted-foreground">Create and manage essay-based assessments and research work.</p>
                        </div>

                        <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsCreating(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Assignment
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assignments..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                                                {assignment.submissionType}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                                            {assignment.title}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                            <CalendarIcon className="h-3 w-3" />
                                            Due: {format(new Date(assignment.dueDate), "PPP")}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                {assignment.totalMarks} Marks
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {assignment.isGroup ? "Group" : "Individual"}
                                            </span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                                        <Button
                                            className="flex-1 font-bold"
                                            onClick={() => navigate(`/teacher/assignments/${assignment.id}/grade`)}
                                        >
                                            Grade Submissions
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Notify students who haven't submitted"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                notifyNonSubmitters(assignment.id);
                                            }}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}

                        {filteredAssignments.length === 0 && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                                <p className="text-muted-foreground">No assignments found. Start by creating your first assessment.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

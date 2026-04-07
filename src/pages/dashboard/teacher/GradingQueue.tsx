import { useEffect, useMemo, useState } from "react";
import { useAssignments } from "@/hooks/useAssignments";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Calculator, ClipboardCheck, Clock3, FileText, Layers3, Plus, Save, Settings2, Users } from "lucide-react";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import type { AssignmentGroup } from "@/types";

type GradebookItem = {
    id: string;
    title: string;
    kind: "assignment" | "quiz";
    subjectId: string;
    groupId?: string | null;
    countsTowardsFinal: boolean;
    pointsPossible: number;
    dueDate?: string;
};

const DEFAULT_GROUPS = [
    { name: "Quizzes", weightPercentage: 40 },
    { name: "Assignments", weightPercentage: 40 },
    { name: "Tests & Exams", weightPercentage: 20 },
];

export default function GradingQueue() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { assignments, submissions, updateAssignment } = useAssignments();
    const { subjects, quizzes, submissions: quizSubmissions, updateQuiz } = useSubjects();
    const { teachers } = useSchoolData();
    const { subjectClasses, studentSubjectClasses, students } = useRegistrationData();

    const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
    const [isSavingGroups, setIsSavingGroups] = useState(false);

    const teacherProfile = useMemo(() => teachers.find(t => t.id === user?.id), [teachers, user?.id]);
    const teacherSubjectIds = teacherProfile?.subjects || [];
    const teacherSubjects = subjects.filter(subject => teacherSubjectIds.includes(subject.id));
    const teacherSubjectClasses = subjectClasses.filter(subjectClass => teacherSubjectIds.includes(subjectClass.subjectId));

    useEffect(() => {
        if (teacherSubjectIds.length === 0) {
            setAssignmentGroups([]);
            return;
        }

        let cancelled = false;

        const fetchGroups = async () => {
            const { data, error } = await supabase
                .from("assignment_groups")
                .select("*")
                .in("subject_id", teacherSubjectIds)
                .order("order", { ascending: true });

            if (error) {
                console.error("Failed to fetch assignment groups", error);
                toast.error("Could not load gradebook groups");
                return;
            }

            if (cancelled) return;

            setAssignmentGroups((data || []).map(group => ({
                id: group.id,
                subjectId: group.subject_id,
                name: group.name,
                weightPercentage: Number(group.weight_percentage || 0),
                order: group.order ?? 0,
            })));
        };

        void fetchGroups();
        return () => {
            cancelled = true;
        };
    }, [teacherSubjectIds.join(",")]);

    const getGroupsForSubject = (subjectId: string) => {
        return assignmentGroups
            .filter(group => group.subjectId === subjectId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    };

    const getFallbackGroupId = (subjectId: string, preferredName: string) => {
        const groups = getGroupsForSubject(subjectId);
        return groups.find(group => group.name.toLowerCase() === preferredName.toLowerCase())?.id || groups[0]?.id || null;
    };

    const getAssessmentItemsForSubject = (subjectId: string): GradebookItem[] => {
        const assignmentItems: GradebookItem[] = assignments
            .filter(assignment => assignment.subjectId === subjectId)
            .map(assignment => ({
                id: assignment.id,
                title: assignment.title,
                kind: "assignment",
                subjectId,
                groupId: assignment.groupId ?? getFallbackGroupId(subjectId, assignment.assessmentCategory === "test" || assignment.assessmentCategory === "exam" ? "Tests & Exams" : "Assignments"),
                countsTowardsFinal: assignment.countsTowardsFinal ?? true,
                pointsPossible: assignment.totalMarks,
                dueDate: assignment.dueDate,
            }));

        const quizItems: GradebookItem[] = quizzes
            .filter(quiz => quiz.subjectId === subjectId)
            .map(quiz => ({
                id: quiz.id,
                title: quiz.title,
                kind: "quiz",
                subjectId,
                groupId: quiz.groupId ?? getFallbackGroupId(subjectId, "Quizzes"),
                countsTowardsFinal: quiz.countsTowardsFinal ?? true,
                pointsPossible: quiz.pointsPossible || quiz.questions.reduce((sum, question) => sum + (question.points || 0), 0),
                dueDate: quiz.settings?.availability?.endDate,
            }));

        return [...assignmentItems, ...quizItems].sort((a, b) => {
            const aDate = new Date(a.dueDate || 0).getTime();
            const bDate = new Date(b.dueDate || 0).getTime();
            if (aDate !== bDate) return aDate - bDate;
            return a.title.localeCompare(b.title);
        });
    };

    const getStudentScoreForItem = (studentId: string, item: GradebookItem) => {
        if (item.kind === "assignment") {
            const submission = submissions.find(record => record.assignmentId === item.id && record.studentId === studentId && record.status === "graded");
            if (!submission) return null;
            return { score: submission.totalGrade, display: `${submission.totalGrade}/${item.pointsPossible}` };
        }

        const submission = quizSubmissions.find(record => record.quizId === item.id && record.studentId === studentId && record.status === "completed");
        if (!submission) return null;
        return { score: submission.score, display: `${submission.score}/${submission.totalPoints || item.pointsPossible}` };
    };

    const calculateStudentGrade = (studentId: string, subjectId: string) => {
        const groups = getGroupsForSubject(subjectId);
        const items = getAssessmentItemsForSubject(subjectId).filter(item => item.countsTowardsFinal && item.groupId);

        const finalGrade = groups.reduce((sum, group) => {
            const groupItems = items.filter(item => item.groupId === group.id);
            const totals = groupItems.reduce((acc, item) => {
                const score = getStudentScoreForItem(studentId, item);
                return {
                    earned: acc.earned + (score?.score || 0),
                    possible: acc.possible + item.pointsPossible,
                };
            }, { earned: 0, possible: 0 });

            const rawPercentage = totals.possible > 0 ? (totals.earned / totals.possible) * 100 : 0;
            return sum + (rawPercentage * (group.weightPercentage / 100));
        }, 0);

        return finalGrade;
    };

    const createDefaultGroupsForSubject = async (subjectId: string) => {
        const payload = DEFAULT_GROUPS.map((group, index) => ({
            subject_id: subjectId,
            name: group.name,
            weight_percentage: group.weightPercentage,
            order: index + 1,
        }));

        const { data, error } = await supabase
            .from("assignment_groups")
            .insert(payload)
            .select();

        if (error) {
            console.error("Failed to create default groups", error);
            toast.error("Could not create default gradebook groups");
            return;
        }

        setAssignmentGroups(prev => [
            ...prev,
            ...(data || []).map(group => ({
                id: group.id,
                subjectId: group.subject_id,
                name: group.name,
                weightPercentage: Number(group.weight_percentage || 0),
                order: group.order ?? 0,
            }))
        ]);
    };

    const updateGroupField = (groupId: string, field: "name" | "weightPercentage", value: string | number) => {
        setAssignmentGroups(prev => prev.map(group => group.id === groupId ? {
            ...group,
            [field]: field === "weightPercentage" ? Number(value) : value
        } : group));
    };

    const addGroupRow = async (subjectId: string) => {
        const nextOrder = getGroupsForSubject(subjectId).length + 1;
        const { data, error } = await supabase
            .from("assignment_groups")
            .insert({
                subject_id: subjectId,
                name: `Group ${nextOrder}`,
                weight_percentage: 0,
                order: nextOrder,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to add group", error);
            toast.error("Could not add a gradebook group");
            return;
        }

        setAssignmentGroups(prev => [...prev, {
            id: data.id,
            subjectId: data.subject_id,
            name: data.name,
            weightPercentage: Number(data.weight_percentage || 0),
            order: data.order ?? nextOrder,
        }]);
    };

    const saveGroupsForSubject = async (subjectId: string) => {
        setIsSavingGroups(true);
        try {
            const subjectGroups = getGroupsForSubject(subjectId);
            const totalWeight = subjectGroups.reduce((sum, group) => sum + group.weightPercentage, 0);
            if (totalWeight !== 100) {
                toast.error(`Gradebook weights for this subject must total 100%. Current total is ${totalWeight}%.`);
                return;
            }

            for (const group of subjectGroups) {
                const { error } = await supabase
                    .from("assignment_groups")
                    .update({
                        name: group.name,
                        weight_percentage: group.weightPercentage,
                        order: group.order,
                    })
                    .eq("id", group.id);

                if (error) throw error;
            }

            toast.success("Gradebook setup saved");
        } catch (error) {
            console.error("Failed to save groups", error);
            toast.error("Could not save gradebook setup");
        } finally {
            setIsSavingGroups(false);
        }
    };

    const updateItemSettings = async (item: GradebookItem, updates: { groupId?: string | null; countsTowardsFinal?: boolean }) => {
        try {
            if (item.kind === "assignment") {
                await updateAssignment(item.id, {
                    groupId: updates.groupId !== undefined ? updates.groupId : item.groupId,
                    countsTowardsFinal: updates.countsTowardsFinal !== undefined ? updates.countsTowardsFinal : item.countsTowardsFinal,
                });
            } else {
                await updateQuiz(item.id, {
                    groupId: updates.groupId !== undefined ? updates.groupId : item.groupId,
                    countsTowardsFinal: updates.countsTowardsFinal !== undefined ? updates.countsTowardsFinal : item.countsTowardsFinal,
                });
            }
        } catch (error) {
            console.error("Failed to update gradebook item", error);
            toast.error("Could not update gradebook item settings");
        }
    };

    const subjectQueue = teacherSubjects.map(subject => {
        const classes = teacherSubjectClasses.filter(subjectClass => subjectClass.subjectId === subject.id);
        const groups = getGroupsForSubject(subject.id);
        const items = getAssessmentItemsForSubject(subject.id);

        const classQueue = classes.map(subjectClass => {
            const classStudentIds = new Set(
                studentSubjectClasses
                    .filter(item => item.subjectClassId === subjectClass.id)
                    .map(item => item.studentId)
            );

            const classStudents = students
                .filter(student => classStudentIds.has(student.id))
                .sort((a, b) => a.name.localeCompare(b.name));

            const pendingAssignments = submissions.filter(submission => {
                const item = items.find(record => record.kind === "assignment" && record.id === submission.assignmentId);
                return item && classStudentIds.has(submission.studentId) && submission.status !== "graded";
            });

            const pendingQuizSubmissions = quizSubmissions.filter(submission => {
                const item = items.find(record => record.kind === "quiz" && record.id === submission.quizId);
                return item && classStudentIds.has(submission.studentId) && submission.status !== "completed";
            });

            return {
                subjectClass,
                classStudents,
                pendingAssignments,
                pendingQuizSubmissions,
            };
        });

        return { subject, groups, items, classQueue };
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Grading Queue & Gradebook</h1>
                <p className="text-muted-foreground">Set up subject grade groups, decide what counts toward the final grade, and mark class by class from one place.</p>
            </div>

            <div className="space-y-8">
                {subjectQueue.map(({ subject, groups, items, classQueue }) => (
                    <section key={subject.id} className="space-y-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{subject.name}</h2>
                                <p className="text-sm text-muted-foreground">Grade {subject.gradeTier}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{items.length} gradebook columns</Badge>
                                <Badge variant="outline">{classQueue.length} subject classes</Badge>
                            </div>
                        </div>

                        <Card className="border-muted/20 bg-card/70">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Settings2 className="h-4 w-4 text-primary" />
                                    Gradebook Setup
                                </CardTitle>
                                <CardDescription>
                                    Create grade groups per subject, set weights once, and place each assessment or quiz into the right group.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {groups.length === 0 ? (
                                    <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-background/50 p-5">
                                        <p className="text-sm text-muted-foreground">No gradebook groups exist for this subject yet.</p>
                                        <div>
                                            <Button onClick={() => void createDefaultGroupsForSubject(subject.id)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Default Groups
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid gap-3 md:grid-cols-3">
                                            {groups.map(group => (
                                                <div key={group.id} className="rounded-xl border bg-background/60 p-4 space-y-3">
                                                    <Input
                                                        value={group.name}
                                                        onChange={(e) => updateGroupField(group.id, "name", e.target.value)}
                                                        className="font-bold"
                                                    />
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Weight %</label>
                                                        <Input
                                                            type="number"
                                                            value={group.weightPercentage}
                                                            onChange={(e) => updateGroupField(group.id, "weightPercentage", parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Button variant="outline" onClick={() => void addGroupRow(subject.id)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Group
                                            </Button>
                                            <Button onClick={() => void saveGroupsForSubject(subject.id)} disabled={isSavingGroups}>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Gradebook Setup
                                            </Button>
                                            <Badge variant="secondary">
                                                Weight Total: {groups.reduce((sum, group) => sum + group.weightPercentage, 0)}%
                                            </Badge>
                                        </div>

                                        <Separator />
                                        <div className="space-y-3">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Assessment Settings</p>
                                            <div className="space-y-3">
                                                {items.map(item => (
                                                    <div key={`${item.kind}-${item.id}`} className="grid gap-3 rounded-xl border bg-background/60 p-4 md:grid-cols-[1.5fr_1fr_auto]">
                                                        <div>
                                                            <p className="font-bold">{item.title}</p>
                                                            <p className="text-xs text-muted-foreground">{item.kind === "quiz" ? "Quiz" : "Assessment"} • {item.pointsPossible} points</p>
                                                        </div>
                                                        <Select
                                                            value={item.groupId || ""}
                                                            onValueChange={(value) => void updateItemSettings(item, { groupId: value })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Choose group" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {groups.map(group => (
                                                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <label className="flex items-center gap-2 text-sm font-medium">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.countsTowardsFinal}
                                                                onChange={(e) => void updateItemSettings(item, { countsTowardsFinal: e.target.checked })}
                                                            />
                                                            Counts to final
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid gap-4">
                            {classQueue.map(({ subjectClass, classStudents, pendingAssignments, pendingQuizSubmissions }) => (
                                <Card key={subjectClass.id} className="border-muted/20 bg-card/70">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Layers3 className="h-4 w-4 text-primary" />
                                            {subjectClass.name}
                                        </CardTitle>
                                        <CardDescription className="flex flex-wrap gap-3">
                                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {classStudents.length} learners</span>
                                            <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {pendingAssignments.length + pendingQuizSubmissions.length} pending</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-3 md:grid-cols-3 text-sm">
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Pending Assessments</p>
                                                <p className="mt-2 text-2xl font-black">{pendingAssignments.length}</p>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Pending Quizzes</p>
                                                <p className="mt-2 text-2xl font-black">{pendingQuizSubmissions.length}</p>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><Calculator className="h-4 w-4 text-green-600" /> Gradebook Columns</p>
                                                <p className="mt-2 text-2xl font-black">{items.length}</p>
                                            </div>
                                        </div>

                                        <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
                                            <table className="w-full min-w-[900px] text-sm">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-black">Learner</th>
                                                        {items.map(item => (
                                                            <th key={`${item.kind}-${item.id}`} className="px-3 py-3 text-center font-black min-w-[140px]">
                                                                <div className="space-y-1">
                                                                    <p className="truncate">{item.title}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{item.pointsPossible} pts</p>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="sticky right-0 z-10 bg-muted/30 px-4 py-3 text-center font-black min-w-[140px]">Final Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {classStudents.map(student => (
                                                        <tr key={student.id} className="border-t">
                                                            <td className="sticky left-0 z-10 bg-background px-4 py-3 font-bold">{student.name}</td>
                                                            {items.map(item => {
                                                                const score = getStudentScoreForItem(student.id, item);
                                                                return (
                                                                    <td key={`${student.id}-${item.kind}-${item.id}`} className="px-3 py-3 text-center">
                                                                        {score ? <span className="font-semibold">{score.display}</span> : <span className="text-muted-foreground">-</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="sticky right-0 z-10 bg-background px-4 py-3 text-center">
                                                                <Badge className="bg-green-600 text-white">
                                                                    {calculateStudentGrade(student.id, subject.id).toFixed(1)}%
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </ScrollArea>

                                        {pendingAssignments.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ready to mark</p>
                                                {pendingAssignments.slice(0, 4).map(submission => {
                                                    const assignment = assignments.find(item => item.id === submission.assignmentId);
                                                    return (
                                                        <div key={submission.id} className="flex items-center justify-between rounded-xl border bg-background/70 p-3">
                                                            <div>
                                                                <p className="font-bold">{assignment?.title || "Assessment"}</p>
                                                                <p className="text-xs text-muted-foreground">{submission.studentName}</p>
                                                            </div>
                                                            <Button size="sm" onClick={() => navigate(`/teacher/assignments/${submission.assignmentId}/grade`)}>
                                                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                                                Mark
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

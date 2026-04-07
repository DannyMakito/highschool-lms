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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Calculator, ClipboardCheck, Clock3, FileText, Plus, Save, Settings2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { buildGradebookScoreMap, calculateWeightedGradebookTotal, clampGradebookScore, normalizeMaxPoints } from "@/lib/gradebook";
import type { AssignmentGroup, StudentGradebookScore } from "@/types";

const DEFAULT_GRADEBOOK_COLUMNS = [
    { name: "Quizzes & Assignments", weightPercentage: 35, maxPoints: 20 },
    { name: "Tests & Exams", weightPercentage: 60, maxPoints: 100 },
    { name: "Extra Curricular Activities", weightPercentage: 5, maxPoints: 5 },
];

type ScoreDraftMap = Record<string, string>;

export default function GradingQueue() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { assignments, submissions } = useAssignments();
    const { subjects, submissions: quizSubmissions } = useSubjects();
    const { teachers } = useSchoolData();
    const { subjectClasses, studentSubjectClasses, students } = useRegistrationData();

    const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
    const [gradebookScores, setGradebookScores] = useState<StudentGradebookScore[]>([]);
    const [scoreDrafts, setScoreDrafts] = useState<ScoreDraftMap>({});
    const [isSavingGroups, setIsSavingGroups] = useState(false);
    const [savingScoreKey, setSavingScoreKey] = useState<string | null>(null);

    const teacherProfile = useMemo(() => teachers.find((teacher) => teacher.id === user?.id), [teachers, user?.id]);
    const teacherSubjectIds = teacherProfile?.subjects || [];
    const teacherSubjects = subjects.filter((subject) => teacherSubjectIds.includes(subject.id));
    const teacherSubjectClasses = subjectClasses.filter((subjectClass) => teacherSubjectIds.includes(subjectClass.subjectId));
    const scoreMap = useMemo(() => buildGradebookScoreMap(gradebookScores), [gradebookScores]);

    useEffect(() => {
        if (teacherSubjectIds.length === 0) {
            setAssignmentGroups([]);
            setGradebookScores([]);
            return;
        }

        let cancelled = false;

        const fetchGradebookData = async () => {
            const [groupsRes, scoresRes] = await Promise.all([
                supabase
                    .from("assignment_groups")
                    .select("*")
                    .in("subject_id", teacherSubjectIds)
                    .order("order", { ascending: true }),
                supabase
                    .from("student_gradebook_scores")
                    .select("*")
                    .in("subject_id", teacherSubjectIds),
            ]);

            if (groupsRes.error) {
                console.error("Failed to fetch gradebook setup", groupsRes.error);
                toast.error("Could not load the gradebook setup");
                return;
            }

            if (scoresRes.error) {
                console.error("Failed to fetch gradebook scores", scoresRes.error);
                toast.error("Could not load learner gradebook scores");
                return;
            }

            if (cancelled) return;

            setAssignmentGroups((groupsRes.data || []).map((group) => ({
                id: group.id,
                subjectId: group.subject_id,
                name: group.name,
                weightPercentage: Number(group.weight_percentage || 0),
                maxPoints: normalizeMaxPoints(group.max_points),
                order: group.order ?? 0,
            })));

            setGradebookScores((scoresRes.data || []).map((entry) => ({
                id: entry.id,
                subjectId: entry.subject_id,
                assignmentGroupId: entry.assignment_group_id,
                studentId: entry.student_id,
                score: Number(entry.score || 0),
                feedback: entry.feedback,
                updatedAt: entry.updated_at,
            })));
        };

        void fetchGradebookData();

        return () => {
            cancelled = true;
        };
    }, [teacherSubjectIds.join(",")]);

    const getGroupsForSubject = (subjectId: string) => (
        assignmentGroups
            .filter((group) => group.subjectId === subjectId)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
    );

    const createDefaultSetupForSubject = async (subjectId: string) => {
        const payload = DEFAULT_GRADEBOOK_COLUMNS.map((column, index) => ({
            subject_id: subjectId,
            name: column.name,
            weight_percentage: column.weightPercentage,
            max_points: column.maxPoints,
            order: index + 1,
        }));

        const { data, error } = await supabase
            .from("assignment_groups")
            .insert(payload)
            .select();

        if (error) {
            console.error("Failed to create gradebook setup", error);
            toast.error("Could not create the gradebook setup");
            return;
        }

        setAssignmentGroups((prev) => [
            ...prev,
            ...(data || []).map((group) => ({
                id: group.id,
                subjectId: group.subject_id,
                name: group.name,
                weightPercentage: Number(group.weight_percentage || 0),
                maxPoints: normalizeMaxPoints(group.max_points),
                order: group.order ?? 0,
            })),
        ]);

        toast.success("Gradebook setup created");
    };

    const addSetupColumn = async (subjectId: string) => {
        const nextOrder = getGroupsForSubject(subjectId).length + 1;

        const { data, error } = await supabase
            .from("assignment_groups")
            .insert({
                subject_id: subjectId,
                name: `Column ${nextOrder}`,
                weight_percentage: 0,
                max_points: 5,
                order: nextOrder,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to add gradebook column", error);
            toast.error("Could not add the gradebook column");
            return;
        }

        setAssignmentGroups((prev) => [
            ...prev,
            {
                id: data.id,
                subjectId: data.subject_id,
                name: data.name,
                weightPercentage: Number(data.weight_percentage || 0),
                maxPoints: normalizeMaxPoints(data.max_points),
                order: data.order ?? nextOrder,
            },
        ]);
    };

    const updateGroupField = (
        groupId: string,
        field: "name" | "weightPercentage" | "maxPoints",
        value: string | number
    ) => {
        setAssignmentGroups((prev) => prev.map((group) => {
            if (group.id !== groupId) return group;

            if (field === "name") {
                return { ...group, name: String(value) };
            }

            const numericValue = Number(value);
            return {
                ...group,
                [field]: Number.isFinite(numericValue) ? numericValue : 0,
            };
        }));
    };

    const deleteSetupColumn = async (groupId: string) => {
        const { error } = await supabase
            .from("assignment_groups")
            .delete()
            .eq("id", groupId);

        if (error) {
            console.error("Failed to delete gradebook column", error);
            toast.error("Could not delete the gradebook column");
            return;
        }

        setAssignmentGroups((prev) => prev.filter((group) => group.id !== groupId));
        setGradebookScores((prev) => prev.filter((entry) => entry.assignmentGroupId !== groupId));
        toast.success("Gradebook column deleted");
    };

    const saveGroupsForSubject = async (subjectId: string) => {
        const subjectGroups = getGroupsForSubject(subjectId);
        const totalWeight = subjectGroups.reduce((sum, group) => sum + Number(group.weightPercentage || 0), 0);

        if (subjectGroups.length === 0) {
            toast.error("Create at least one gradebook column first");
            return;
        }

        if (totalWeight !== 100) {
            toast.error(`Gradebook weights must total 100%. Current total: ${totalWeight}%.`);
            return;
        }

        const hasInvalidColumn = subjectGroups.some((group) => !group.name.trim() || normalizeMaxPoints(group.maxPoints) <= 0);
        if (hasInvalidColumn) {
            toast.error("Every gradebook column needs a name and a max score greater than 0");
            return;
        }

        setIsSavingGroups(true);

        try {
            for (const group of subjectGroups) {
                const { error } = await supabase
                    .from("assignment_groups")
                    .update({
                        name: group.name.trim(),
                        weight_percentage: Number(group.weightPercentage || 0),
                        max_points: normalizeMaxPoints(group.maxPoints),
                        order: group.order ?? 0,
                    })
                    .eq("id", group.id);

                if (error) throw error;
            }

            toast.success("Gradebook setup saved");
        } catch (error) {
            console.error("Failed to save gradebook setup", error);
            toast.error("Could not save the gradebook setup");
        } finally {
            setIsSavingGroups(false);
        }
    };

    const handleScoreDraftChange = (studentId: string, groupId: string, value: string) => {
        setScoreDrafts((prev) => ({
            ...prev,
            [`${studentId}:${groupId}`]: value,
        }));
    };

    const getDisplayedScore = (studentId: string, group: AssignmentGroup) => {
        const key = `${studentId}:${group.id}`;
        return scoreDrafts[key] ?? (scoreMap[key] ? String(scoreMap[key].score) : "");
    };

    const saveStudentScore = async (studentId: string, subjectId: string, group: AssignmentGroup) => {
        const key = `${studentId}:${group.id}`;
        const rawValue = scoreDrafts[key] ?? (scoreMap[key] ? String(scoreMap[key].score) : "");
        const trimmedValue = rawValue.trim();

        if (!trimmedValue) {
            const existingEntry = scoreMap[key];
            if (!existingEntry) {
                return;
            }

            setSavingScoreKey(key);

            try {
                const { error } = await supabase
                    .from("student_gradebook_scores")
                    .delete()
                    .eq("id", existingEntry.id);

                if (error) throw error;

                setGradebookScores((prev) => prev.filter((entry) => entry.id !== existingEntry.id));
                setScoreDrafts((prev) => ({
                    ...prev,
                    [key]: "",
                }));
            } catch (error) {
                console.error("Failed to clear learner gradebook score", error);
                toast.error("Could not clear that learner score");
            } finally {
                setSavingScoreKey(null);
            }
            return;
        }

        const parsedValue = Number(trimmedValue);
        if (!Number.isFinite(parsedValue)) {
            toast.error("Gradebook scores must be valid numbers");
            return;
        }

        const clampedScore = clampGradebookScore(parsedValue, normalizeMaxPoints(group.maxPoints));
        setSavingScoreKey(key);

        try {
            const { data, error } = await supabase
                .from("student_gradebook_scores")
                .upsert({
                    subject_id: subjectId,
                    assignment_group_id: group.id,
                    student_id: studentId,
                    score: clampedScore,
                }, {
                    onConflict: "student_id,assignment_group_id",
                })
                .select()
                .single();

            if (error) throw error;

            const nextEntry: StudentGradebookScore = {
                id: data.id,
                subjectId: data.subject_id,
                assignmentGroupId: data.assignment_group_id,
                studentId: data.student_id,
                score: Number(data.score || 0),
                feedback: data.feedback,
                updatedAt: data.updated_at,
            };

            setGradebookScores((prev) => {
                const existingIndex = prev.findIndex((entry) => entry.studentId === studentId && entry.assignmentGroupId === group.id);
                if (existingIndex === -1) {
                    return [...prev, nextEntry];
                }

                const clone = [...prev];
                clone[existingIndex] = nextEntry;
                return clone;
            });

            setScoreDrafts((prev) => ({
                ...prev,
                [key]: String(clampedScore),
            }));
        } catch (error) {
            console.error("Failed to save learner gradebook score", error);
            toast.error("Could not save that learner score");
        } finally {
            setSavingScoreKey(null);
        }
    };

    const subjectQueue = teacherSubjects.map((subject) => {
        const groups = getGroupsForSubject(subject.id);
        const classes = teacherSubjectClasses.filter((subjectClass) => subjectClass.subjectId === subject.id);

        const classQueue = classes.map((subjectClass) => {
            const classStudentIds = new Set(
                studentSubjectClasses
                    .filter((entry) => entry.subjectClassId === subjectClass.id)
                    .map((entry) => entry.studentId)
            );

            const classStudents = students
                .filter((student) => classStudentIds.has(student.id))
                .sort((a, b) => a.name.localeCompare(b.name));

            const pendingAssignments = submissions.filter((submission) => (
                classStudentIds.has(submission.studentId) && submission.status !== "graded"
            ));

            const gradedAssignments = submissions.filter((submission) => (
                classStudentIds.has(submission.studentId) && submission.status === "graded"
            ));

            const pendingQuizSubmissions = quizSubmissions.filter((submission) => (
                classStudentIds.has(submission.studentId) && submission.status !== "completed"
            ));

            const completedQuizSubmissions = quizSubmissions.filter((submission) => (
                classStudentIds.has(submission.studentId) && submission.status === "completed"
            ));

            return {
                subjectClass,
                classStudents,
                pendingAssignments,
                gradedAssignments,
                pendingQuizSubmissions,
                completedQuizSubmissions,
            };
        });

        return { subject, groups, classQueue };
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Grading Queue & Gradebook</h1>
                <p className="text-muted-foreground">
                    Each subject has one gradebook setup. Add the columns you want learners tracked against, set the yearly weight of each column, and score learners class by class.
                </p>
            </div>

            <div className="space-y-8">
                {subjectQueue.map(({ subject, groups, classQueue }) => (
                    <section key={subject.id} className="space-y-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{subject.name}</h2>
                                <p className="text-sm text-muted-foreground">Grade {subject.gradeTier}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{groups.length} gradebook columns</Badge>
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
                                    This subject can only have one setup. Update it anytime by editing the columns below, for example tests, quizzes, exams, or extra curricular activities.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {groups.length === 0 ? (
                                    <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-background/50 p-5">
                                        <p className="text-sm text-muted-foreground">No gradebook setup exists for this subject yet.</p>
                                        <div>
                                            <Button onClick={() => void createDefaultSetupForSubject(subject.id)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create Gradebook Setup
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid gap-3 md:grid-cols-3">
                                            {groups.map((group) => (
                                                <div key={group.id} className="rounded-xl border bg-background/60 p-4 space-y-3">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Column Name</label>
                                                        <Input
                                                            value={group.name}
                                                            onChange={(e) => updateGroupField(group.id, "name", e.target.value)}
                                                            className="font-bold"
                                                        />
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Weight %</label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                value={group.weightPercentage}
                                                                onChange={(e) => updateGroupField(group.id, "weightPercentage", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Max Score</label>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                value={group.maxPoints ?? 5}
                                                                onChange={(e) => updateGroupField(group.id, "maxPoints", e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                        onClick={() => void deleteSetupColumn(group.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Remove Column
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <Button variant="outline" onClick={() => void addSetupColumn(subject.id)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Column
                                            </Button>
                                            <Button onClick={() => void saveGroupsForSubject(subject.id)} disabled={isSavingGroups}>
                                                <Save className="mr-2 h-4 w-4" />
                                                {isSavingGroups ? "Saving..." : "Save Gradebook Setup"}
                                            </Button>
                                            <Badge variant="secondary">
                                                Weight Total: {groups.reduce((sum, group) => sum + Number(group.weightPercentage || 0), 0)}%
                                            </Badge>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <div className="grid gap-4">
                            {classQueue.map(({ subjectClass, classStudents, pendingAssignments, gradedAssignments, pendingQuizSubmissions, completedQuizSubmissions }) => (
                                <Card key={subjectClass.id} className="border-muted/20 bg-card/70">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Users className="h-4 w-4 text-primary" />
                                            {subjectClass.name}
                                        </CardTitle>
                                        <CardDescription className="flex flex-wrap gap-3">
                                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {classStudents.length} learners</span>
                                            <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {pendingAssignments.length + pendingQuizSubmissions.length} pending for marking</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-3 md:grid-cols-4 text-sm">
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Pending Assessments</p>
                                                <p className="mt-2 text-2xl font-black">{pendingAssignments.length}</p>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Historical Assessment Grades</p>
                                                <p className="mt-2 text-2xl font-black">{gradedAssignments.length}</p>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Pending Quizzes</p>
                                                <p className="mt-2 text-2xl font-black">{pendingQuizSubmissions.length}</p>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><Calculator className="h-4 w-4 text-green-600" /> Historical Quiz Grades</p>
                                                <p className="mt-2 text-2xl font-black">{completedQuizSubmissions.length}</p>
                                            </div>
                                        </div>

                                        {groups.length > 0 ? (
                                            <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
                                                <table className="w-full min-w-[900px] text-sm">
                                                    <thead className="bg-muted/30">
                                                        <tr>
                                                            <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-black">Learner</th>
                                                            {groups.map((group) => (
                                                                <th key={group.id} className="px-3 py-3 text-center font-black min-w-[180px]">
                                                                    <div className="space-y-1">
                                                                        <p className="truncate">{group.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground">
                                                                            /{normalizeMaxPoints(group.maxPoints)} • {group.weightPercentage}%
                                                                        </p>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th className="sticky right-0 z-10 bg-muted/30 px-4 py-3 text-center font-black min-w-[140px]">Year Mark</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {classStudents.map((student) => (
                                                            <tr key={student.id} className="border-t">
                                                                <td className="sticky left-0 z-10 bg-background px-4 py-3 font-bold">{student.name}</td>
                                                                {groups.map((group) => {
                                                                    const key = `${student.id}:${group.id}`;
                                                                    return (
                                                                        <td key={key} className="px-3 py-3 text-center">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <Input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    max={normalizeMaxPoints(group.maxPoints)}
                                                                                    step="0.1"
                                                                                    value={getDisplayedScore(student.id, group)}
                                                                                    onChange={(e) => handleScoreDraftChange(student.id, group.id, e.target.value)}
                                                                                    onBlur={() => void saveStudentScore(student.id, subject.id, group)}
                                                                                    onKeyDown={(event) => {
                                                                                        if (event.key === "Enter") {
                                                                                            event.currentTarget.blur();
                                                                                        }
                                                                                    }}
                                                                                    className="w-24 text-center font-semibold"
                                                                                />
                                                                                <span className="text-xs font-bold text-muted-foreground">
                                                                                    /{normalizeMaxPoints(group.maxPoints)}
                                                                                </span>
                                                                                {savingScoreKey === key ? (
                                                                                    <span className="text-[10px] font-bold text-primary">Saving</span>
                                                                                ) : null}
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="sticky right-0 z-10 bg-background px-4 py-3 text-center">
                                                                    <Badge className="bg-green-600 text-white">
                                                                        {calculateWeightedGradebookTotal(groups, scoreMap, student.id).toFixed(1)}%
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </ScrollArea>
                                        ) : (
                                            <div className="rounded-xl border border-dashed bg-background/50 p-5 text-sm text-muted-foreground">
                                                Create the subject gradebook setup first, then learner rows will appear here with your setup columns.
                                            </div>
                                        )}

                                        <Separator />

                                        {pendingAssignments.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ready to mark assessments</p>
                                                {pendingAssignments.slice(0, 4).map((submission) => (
                                                    <div key={submission.id} className="flex items-center justify-between rounded-xl border bg-background/70 p-3">
                                                        <div>
                                                            <p className="font-bold">{assignments.find((item) => item.id === submission.assignmentId)?.title || "Assessment"}</p>
                                                            <p className="text-xs text-muted-foreground">{submission.studentName}</p>
                                                        </div>
                                                        <Button size="sm" onClick={() => navigate(`/teacher/assignments/${submission.assignmentId}/grade`)}>
                                                            <ClipboardCheck className="mr-2 h-4 w-4" />
                                                            Mark
                                                        </Button>
                                                    </div>
                                                ))}
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

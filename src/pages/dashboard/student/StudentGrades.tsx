import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
    BookOpen,
    Calculator,
    ChevronRight,
    ClipboardList,
    FlaskConical,
    Landmark,
    Palette,
    ScrollText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { useAssignments } from "@/hooks/useAssignments";
import { buildGradebookScoreMap, calculateWeightedGradebookTotal, normalizeMaxPoints } from "@/lib/gradebook";
import supabase from "@/lib/supabase";
import type {
    Assignment,
    AssignmentGroup,
    AssignmentSubmission,
    Quiz,
    QuizSubmission,
    StudentGradebookScore,
    Subject,
} from "@/types";

type AssessmentRow = {
    key: string;
    id: string;
    kind: "assignment" | "quiz";
    title: string;
    subjectId: string;
    dueDate: string | null;
    status: string;
    groupId: string | null;
    groupName: string;
    groupWeightPercentage: number;
    periodLabel: string;
    countsTowardsFinal: boolean;
    contributionWeight: number;
    rawScore: number | null;
    rawMax: number;
    percentage: number | null;
    earnedContribution: number | null;
    route: string;
    submission: AssignmentSubmission | QuizSubmission | null;
    assignment: Assignment | null;
    quiz: Quiz | null;
};

const getSubjectIcon = (subject: Subject) => {
    const name = `${subject.name} ${subject.category || ""}`.toLowerCase();
    if (name.includes("math") || name.includes("account")) return Calculator;
    if (name.includes("science") || name.includes("physics") || name.includes("chem")) return FlaskConical;
    if (name.includes("history") || name.includes("geo")) return Landmark;
    if (name.includes("art") || name.includes("design")) return Palette;
    if (name.includes("english") || name.includes("literature")) return ScrollText;
    return BookOpen;
};

const formatDate = (value?: string | null) => {
    if (!value) return "No date";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "No date";

    return format(parsed, "MMM d, yyyy");
};

const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
};

const getBadgeClassName = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized.includes("graded") || normalized.includes("completed")) return "bg-emerald-600 text-white";
    if (normalized.includes("submitted")) return "bg-sky-600 text-white";
    if (normalized.includes("open")) return "bg-amber-500 text-white";
    if (normalized.includes("upcoming")) return "bg-slate-500 text-white";
    if (normalized.includes("missing") || normalized.includes("closed")) return "bg-rose-600 text-white";

    return "bg-muted text-foreground";
};

const getPeriodLabel = (period?: string | null) => {
    if (period === "year") return "Year";
    return "Term";
};

const computePercentage = (score: number | null, max: number) => {
    if (score === null || max <= 0) return null;
    return (score / max) * 100;
};

const pickLatestAssignmentSubmission = (
    current: AssignmentSubmission | undefined,
    next: AssignmentSubmission
) => {
    if (!current) return next;
    return new Date(next.submittedAt).getTime() > new Date(current.submittedAt).getTime() ? next : current;
};

const pickLatestQuizSubmission = (current: QuizSubmission | undefined, next: QuizSubmission) => {
    if (!current) return next;
    return new Date(next.completedAt).getTime() > new Date(current.completedAt).getTime() ? next : current;
};

export default function StudentGrades() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { studentSubjects, studentSubjectClasses, subjectClasses } = useRegistrationData();
    const { subjects: allSubjects, quizzes, submissions: quizSubmissions } = useSubjects();
    const { assignments, submissions: assignmentSubmissions, getRubric } = useAssignments();

    const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
    const [gradebookScores, setGradebookScores] = useState<StudentGradebookScore[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedAssessmentKey, setSelectedAssessmentKey] = useState<string | null>(null);

    const assignedIds = useMemo(() => {
        const directAssignedIds = studentSubjects
            .filter((entry) => entry.studentId === user?.id)
            .map((entry) => entry.subjectId);

        const classAssignedIds = studentSubjectClasses
            .filter((entry) => entry.studentId === user?.id)
            .map((entry) => subjectClasses.find((subjectClass) => subjectClass.id === entry.subjectClassId)?.subjectId)
            .filter(Boolean) as string[];

        return Array.from(new Set([...directAssignedIds, ...classAssignedIds]));
    }, [studentSubjectClasses, studentSubjects, subjectClasses, user?.id]);

    useEffect(() => {
        if (!user?.id || assignedIds.length === 0) {
            setAssignmentGroups([]);
            setGradebookScores([]);
            return;
        }

        let cancelled = false;

        const fetchGradebook = async () => {
            const [groupsRes, scoresRes] = await Promise.all([
                supabase.from("assignment_groups").select("*").in("subject_id", assignedIds).order("order", { ascending: true }),
                supabase.from("student_gradebook_scores").select("*").eq("student_id", user.id).in("subject_id", assignedIds),
            ]);

            if (groupsRes.error || scoresRes.error) {
                console.error("Failed to fetch learner grades", {
                    groupsError: groupsRes.error,
                    scoresError: scoresRes.error,
                });
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

        void fetchGradebook();

        return () => {
            cancelled = true;
        };
    }, [assignedIds, user?.id]);

    const subjects = useMemo(() => {
        return allSubjects.filter((subject) => assignedIds.includes(subject.id));
    }, [allSubjects, assignedIds]);

    useEffect(() => {
        if (!subjects.length) {
            setSelectedSubjectId(null);
            return;
        }

        if (!selectedSubjectId || !subjects.some((subject) => subject.id === selectedSubjectId)) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [selectedSubjectId, subjects]);

    const latestAssignmentSubmissions = useMemo(() => {
        const map = new Map<string, AssignmentSubmission>();

        assignmentSubmissions
            .filter((submission) => submission.studentId === user?.id)
            .forEach((submission) => {
                map.set(
                    submission.assignmentId,
                    pickLatestAssignmentSubmission(map.get(submission.assignmentId), submission)
                );
            });

        return map;
    }, [assignmentSubmissions, user?.id]);

    const latestQuizSubmissions = useMemo(() => {
        const map = new Map<string, QuizSubmission>();

        quizSubmissions
            .filter((submission) => submission.studentId === user?.id)
            .forEach((submission) => {
                map.set(submission.quizId, pickLatestQuizSubmission(map.get(submission.quizId), submission));
            });

        return map;
    }, [quizSubmissions, user?.id]);

    const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) || null;
    const scoreMap = useMemo(() => buildGradebookScoreMap(gradebookScores), [gradebookScores]);

    const subjectGradebookColumns = useMemo(() => {
        return assignmentGroups
            .filter((group) => group.subjectId === selectedSubjectId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [assignmentGroups, selectedSubjectId]);

    const assessmentRows = useMemo(() => {
        if (!selectedSubjectId) return [];

        const groupNameById = new Map(subjectGradebookColumns.map((group) => [group.id, group.name]));
        const groupWeightById = new Map(subjectGradebookColumns.map((group) => [group.id, group.weightPercentage]));

        const subjectAssignments = assignments
            .filter((assignment) => assignment.subjectId === selectedSubjectId && assignment.status === "published")
            .map((assignment) => {
                const submission = latestAssignmentSubmissions.get(assignment.id) || null;
                const gradeVisible = Boolean(submission && submission.status === "graded" && submission.isReleased);
                const rawScore = gradeVisible ? Number(submission?.totalGrade || 0) : null;
                const rawMax = Number(assignment.totalMarks || 0);
                const percentage = computePercentage(rawScore, rawMax);
                const contributionWeight = Number(assignment.contributionWeight || 0);
                const earnedContribution = percentage === null ? null : (percentage / 100) * contributionWeight;
                const availableAt = assignment.availableFrom ? new Date(assignment.availableFrom).getTime() : null;
                const dueAt = new Date(assignment.dueDate).getTime();
                const now = Date.now();

                let status = "Open";
                if (submission?.status === "graded" && submission.isReleased) {
                    status = "Graded";
                } else if (submission) {
                    status = "Submitted";
                } else if (availableAt && availableAt > now) {
                    status = "Upcoming";
                } else if (dueAt < now) {
                    status = "Missing";
                }

                return {
                    key: `assignment:${assignment.id}`,
                    id: assignment.id,
                    kind: "assignment" as const,
                    title: assignment.title,
                    subjectId: assignment.subjectId,
                    dueDate: assignment.dueDate,
                    status,
                    groupId: assignment.groupId || null,
                    groupName: assignment.groupId ? (groupNameById.get(assignment.groupId) || "Unlinked") : "Unlinked",
                    groupWeightPercentage: assignment.groupId ? Number(groupWeightById.get(assignment.groupId) || 0) : 0,
                    periodLabel: getPeriodLabel(assignment.assessmentPeriod),
                    countsTowardsFinal: assignment.countsTowardsFinal ?? true,
                    contributionWeight,
                    rawScore,
                    rawMax,
                    percentage,
                    earnedContribution,
                    route: `/student/assignments/${assignment.id}`,
                    submission,
                    assignment,
                    quiz: null,
                };
            });

        const subjectQuizzes = quizzes
            .filter((quiz) => quiz.subjectId === selectedSubjectId && quiz.status === "published")
            .map((quiz) => {
                const submission = latestQuizSubmissions.get(quiz.id) || null;
                const rawScore = submission ? Number(submission.score || 0) : null;
                const rawMax = Number(submission?.totalPoints || quiz.pointsPossible || 0);
                const percentage = computePercentage(rawScore, rawMax);
                const endDate = quiz.settings?.availability?.endDate || null;
                const startDate = quiz.settings?.availability?.startDate || null;
                const now = Date.now();
                const startAt = startDate ? new Date(startDate).getTime() : null;
                const endAt = endDate ? new Date(endDate).getTime() : null;

                let status = "Open";
                if (submission?.status === "completed") {
                    status = "Completed";
                } else if (submission?.status === "need-review") {
                    status = "Needs Review";
                } else if (startAt && startAt > now) {
                    status = "Upcoming";
                } else if (endAt && endAt < now) {
                    status = "Closed";
                }

                return {
                    key: `quiz:${quiz.id}`,
                    id: quiz.id,
                    kind: "quiz" as const,
                    title: quiz.title,
                    subjectId: quiz.subjectId,
                    dueDate: endDate,
                    status,
                    groupId: quiz.groupId || null,
                    groupName: quiz.groupId ? (groupNameById.get(quiz.groupId) || "Unlinked") : "Unlinked",
                    groupWeightPercentage: quiz.groupId ? Number(groupWeightById.get(quiz.groupId) || 0) : 0,
                    periodLabel: "Term",
                    countsTowardsFinal: quiz.countsTowardsFinal ?? true,
                    contributionWeight: 0,
                    rawScore,
                    rawMax,
                    percentage,
                    earnedContribution: null,
                    route: `/student/quizzes/${quiz.id}`,
                    submission,
                    assignment: null,
                    quiz,
                };
            });

        return [...subjectAssignments, ...subjectQuizzes].sort((a, b) => {
            const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return bTime - aTime;
        });
    }, [
        assignments,
        latestAssignmentSubmissions,
        latestQuizSubmissions,
        quizzes,
        selectedSubjectId,
        subjectGradebookColumns,
    ]);

    useEffect(() => {
        if (!assessmentRows.length) {
            setSelectedAssessmentKey(null);
            return;
        }

        if (!selectedAssessmentKey || !assessmentRows.some((row) => row.key === selectedAssessmentKey)) {
            setSelectedAssessmentKey(assessmentRows[0].key);
        }
    }, [assessmentRows, selectedAssessmentKey]);

    const selectedAssessment = assessmentRows.find((row) => row.key === selectedAssessmentKey) || null;
    const selectedRubric = selectedAssessment?.assignment?.rubricId
        ? getRubric(selectedAssessment.assignment.rubricId)
        : undefined;

    return (
        <div className="w-full px-4 py-5 md:px-8 lg:px-12 space-y-6 md:space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 font-extrabold tracking-tight">My Grades</h1>
                <p className="text-sm sm:text-base md:text-xl text-muted-foreground mt-1 md:mt-2">
                    Open a subject to see its gradebook setup, assessment list, and how each result feeds into your term and year mark.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {subjects.map((subject) => {
                    const SubjectIcon = getSubjectIcon(subject);
                    const subjectGroups = assignmentGroups
                        .filter((group) => group.subjectId === subject.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    const subjectAssignments = assignments.filter((assignment) => assignment.subjectId === subject.id && assignment.status === "published");
                    const subjectQuizzes = quizzes.filter((quiz) => quiz.subjectId === subject.id && quiz.status === "published");
                    const total = calculateWeightedGradebookTotal(subjectGroups, scoreMap, user?.id || "");
                    const isSelected = subject.id === selectedSubjectId;

                    return (
                        <button
                            key={subject.id}
                            type="button"
                            onClick={() => setSelectedSubjectId(subject.id)}
                            className={`text-left rounded-3xl border transition-all ${
                                isSelected
                                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                    : "border-muted/20 bg-card/70 hover:border-primary/40"
                            }`}
                        >
                            <div className="p-4 md:p-6 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <SubjectIcon className="h-6 w-6 md:h-7 md:w-7" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg md:text-xl font-black">{subject.name}</h2>
                                            <p className="text-sm text-muted-foreground">Grade {subject.gradeTier}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                        {subjectAssignments.length + subjectQuizzes.length} assessments
                                    </Badge>
                                    <Badge variant="outline">{total.toFixed(1)}% year mark</Badge>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedSubject ? (
                <div className="space-y-6">
                    <Card className="border-muted/20 bg-card/70">
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="text-2xl">{selectedSubject.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Gradebook setup scores and current overall year mark
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-green-600 text-white">
                                    Year Mark: {calculateWeightedGradebookTotal(subjectGradebookColumns, scoreMap, user?.id || "").toFixed(1)}%
                                </Badge>
                                <Button type="button" variant="outline" onClick={() => navigate("/student/assignments")}>
                                    View Assessments
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {subjectGradebookColumns.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    {subjectGradebookColumns.map((group) => {
                                        const entry = scoreMap[`${user?.id}:${group.id}`];
                                        return (
                                            <div key={group.id} className="rounded-2xl border bg-background/70 p-4 space-y-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black">{group.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {group.weightPercentage}% of year mark
                                                    </p>
                                                </div>
                                                <div className="flex items-end justify-between gap-3">
                                                    <div className="text-2xl font-black">
                                                        {entry
                                                            ? `${formatNumber(entry.score)} / ${formatNumber(normalizeMaxPoints(group.maxPoints))}`
                                                            : `- / ${formatNumber(normalizeMaxPoints(group.maxPoints))}`}
                                                    </div>
                                                    <Badge variant="secondary">
                                                        Max {formatNumber(normalizeMaxPoints(group.maxPoints))}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                                    Your teacher has not configured this subject gradebook yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-muted/20 bg-card/70">
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="text-2xl">Assessment Record</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    All quizzes and assignments for this subject, aligned to the configured grade columns.
                                </p>
                            </div>
                            <Badge variant="secondary">{assessmentRows.length} rows</Badge>
                        </CardHeader>
                        <CardContent>
                            {assessmentRows.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="space-y-3 md:hidden">
                                        {assessmentRows.map((row) => (
                                            <button
                                                key={row.key}
                                                type="button"
                                                onClick={() => setSelectedAssessmentKey(row.key)}
                                                className={`w-full text-left rounded-2xl border p-4 space-y-3 transition-colors ${
                                                    row.key === selectedAssessmentKey ? "border-primary bg-primary/5" : "border-muted/40"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className="font-bold">{row.title}</p>
                                                    <Badge className={getBadgeClassName(row.status)}>{row.status}</Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="secondary" className="capitalize">{row.kind}</Badge>
                                                    <Badge variant="outline">{row.periodLabel} mark</Badge>
                                                    <Badge variant="outline">{row.groupName}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Due</p>
                                                        <p className="font-semibold">{formatDate(row.dueDate)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grade</p>
                                                        <p className="font-semibold">
                                                            {row.percentage !== null
                                                                ? `${row.percentage.toFixed(1)}%`
                                                                : "Pending"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Score</p>
                                                        <p className="font-semibold">
                                                            {row.rawScore !== null
                                                                ? `${formatNumber(row.rawScore)} / ${formatNumber(row.rawMax)}`
                                                                : "Awaiting grade"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Final Impact</p>
                                                        <p className="font-semibold">
                                                            {row.earnedContribution !== null && row.countsTowardsFinal
                                                                ? `${row.earnedContribution.toFixed(1)}%`
                                                                : row.countsTowardsFinal
                                                                    ? "Tracked"
                                                                    : "Excluded"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => navigate(row.route)}>
                                                    View Result
                                                </Button>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="hidden md:block">
                                        <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
                                            <table className="w-full min-w-[1280px] text-sm">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-black min-w-[250px]">Item Name</th>
                                                        <th className="px-4 py-3 text-left font-black min-w-[120px]">Due Date</th>
                                                        <th className="px-4 py-3 text-left font-black min-w-[120px]">Status</th>
                                                        {subjectGradebookColumns.map((group) => (
                                                            <th key={group.id} className="px-4 py-3 text-left font-black min-w-[190px]">
                                                                <div className="space-y-1">
                                                                    <p>{group.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        {group.weightPercentage}% of year mark
                                                                    </p>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="px-4 py-3 text-left font-black min-w-[140px]">Grade</th>
                                                        <th className="px-4 py-3 text-left font-black min-w-[170px]">Final Mark Impact</th>
                                                        <th className="px-4 py-3 text-left font-black min-w-[120px]">Results</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {assessmentRows.map((row) => (
                                                        <tr
                                                            key={row.key}
                                                            className={`border-t transition-colors ${
                                                                row.key === selectedAssessmentKey ? "bg-primary/5" : "hover:bg-muted/20"
                                                            }`}
                                                        >
                                                            <td className="px-4 py-4">
                                                                <button
                                                                    type="button"
                                                                    className="space-y-1 text-left"
                                                                    onClick={() => setSelectedAssessmentKey(row.key)}
                                                                >
                                                                    <p className="font-bold">{row.title}</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <Badge variant="secondary" className="capitalize">
                                                                            {row.kind}
                                                                        </Badge>
                                                                        <Badge variant="outline">
                                                                            {row.periodLabel} mark
                                                                        </Badge>
                                                                    </div>
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-4 text-muted-foreground">{formatDate(row.dueDate)}</td>
                                                            <td className="px-4 py-4">
                                                                <Badge className={getBadgeClassName(row.status)}>{row.status}</Badge>
                                                            </td>
                                                            {subjectGradebookColumns.map((group) => (
                                                                <td key={group.id} className="px-4 py-4">
                                                                    {row.groupId === group.id ? (
                                                                        <div className="space-y-1">
                                                                            <p className="font-semibold">
                                                                                {row.rawScore !== null
                                                                                    ? `${formatNumber(row.rawScore)} / ${formatNumber(row.rawMax)}`
                                                                                    : "Awaiting grade"}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {row.countsTowardsFinal
                                                                                    ? row.contributionWeight > 0
                                                                                        ? `${formatNumber(row.contributionWeight)}% ${row.periodLabel.toLowerCase()} weighting`
                                                                                        : `${formatNumber(row.groupWeightPercentage)}% grade column weight`
                                                                                    : "Not counted in final mark"}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">-</span>
                                                                    )}
                                                                </td>
                                                            ))}
                                                            <td className="px-4 py-4">
                                                                {row.percentage !== null ? (
                                                                    <div className="space-y-1">
                                                                        <p className="font-bold">{row.percentage.toFixed(1)}%</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {formatNumber(row.rawScore || 0)} / {formatNumber(row.rawMax)}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground">Pending</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                {row.earnedContribution !== null && row.countsTowardsFinal ? (
                                                                    <div className="space-y-1">
                                                                        <p className="font-bold">{row.earnedContribution.toFixed(1)}%</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Earned toward {row.periodLabel.toLowerCase()} mark
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-1">
                                                                        <p className="font-bold text-muted-foreground">
                                                                            {row.countsTowardsFinal ? "Tracked" : "Excluded"}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {row.countsTowardsFinal
                                                                                ? `${formatNumber(row.groupWeightPercentage)}% category weight`
                                                                                : "Not included in final mark"}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <Button type="button" variant="outline" size="sm" onClick={() => navigate(row.route)}>
                                                                    View
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </ScrollArea>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                                    No quizzes or assignments have been published for this subject yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedAssessment ? (
                        <Card className="border-muted/20 bg-card/70">
                            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <CardTitle className="text-2xl">{selectedAssessment.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Detailed grade breakdown for the selected assessment
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="capitalize">
                                        {selectedAssessment.kind}
                                    </Badge>
                                    <Badge variant="outline">{selectedAssessment.groupName}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-2xl border p-4">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grade</p>
                                        <p className="mt-2 text-2xl md:text-3xl font-black">
                                            {selectedAssessment.percentage !== null ? `${selectedAssessment.percentage.toFixed(1)}%` : "Pending"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {selectedAssessment.rawScore !== null
                                                ? `${formatNumber(selectedAssessment.rawScore)} / ${formatNumber(selectedAssessment.rawMax)}`
                                                : "Awaiting released marks"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border p-4">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mark Contribution</p>
                                        <p className="mt-2 text-2xl md:text-3xl font-black">
                                            {selectedAssessment.earnedContribution !== null && selectedAssessment.countsTowardsFinal
                                                ? `${selectedAssessment.earnedContribution.toFixed(1)}%`
                                                : "N/A"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {selectedAssessment.countsTowardsFinal
                                                ? selectedAssessment.contributionWeight > 0
                                                    ? `${formatNumber(selectedAssessment.contributionWeight)}% ${selectedAssessment.periodLabel.toLowerCase()} weighting`
                                                    : `${formatNumber(selectedAssessment.groupWeightPercentage)}% grade column weight`
                                                : "This assessment is excluded from final mark calculations"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border p-4">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Due Date</p>
                                        <p className="mt-2 text-xl md:text-3xl font-black">{formatDate(selectedAssessment.dueDate)}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{selectedAssessment.status}</p>
                                    </div>
                                    <div className="rounded-2xl border p-4">
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grade Column</p>
                                        <p className="mt-2 text-xl md:text-3xl font-black">{selectedAssessment.groupName}</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {selectedAssessment.periodLabel} mark tracking - {formatNumber(selectedAssessment.groupWeightPercentage)}% weight
                                        </p>
                                    </div>
                                </div>

                                {selectedAssessment.assignment && selectedRubric?.criteria?.length ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList className="h-5 w-5 text-primary" />
                                            <h3 className="text-lg font-black">Criterion Breakdown</h3>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            {selectedRubric.criteria.map((criterion) => {
                                                const submission = selectedAssessment.submission as AssignmentSubmission | null;
                                                const score = submission?.rubricGrades?.[criterion.id];

                                                return (
                                                    <div key={criterion.id} className="rounded-2xl border p-4 space-y-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold">{criterion.title}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {criterion.description || "No criterion description"}
                                                                </p>
                                                            </div>
                                                            <Badge variant="secondary">
                                                                / {formatNumber(criterion.maxPoints)}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-2xl font-black">
                                                            {score !== undefined
                                                                ? `${formatNumber(score)} / ${formatNumber(criterion.maxPoints)}`
                                                                : "Not scored"}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : selectedAssessment.kind === "quiz" ? (
                                    <div className="rounded-2xl border p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-black">Quiz Result</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Latest submitted quiz result for this assessment
                                                </p>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => navigate(selectedAssessment.route)}>
                                                Open Quiz Result
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            ) : (
                <div className="rounded-3xl border-2 border-dashed py-20 text-center text-muted-foreground">
                    No subject grades are available yet.
                </div>
            )}
        </div>
    );
}

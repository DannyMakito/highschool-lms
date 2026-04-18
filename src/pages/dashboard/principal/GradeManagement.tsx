import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
    BookOpen,
    Calculator,
    ClipboardList,
    FileChartColumn,
    GraduationCap,
    LayoutList,
    School,
    UserRoundSearch,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssignments } from "@/hooks/useAssignments";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { buildGradebookScoreMap, calculateWeightedGradebookTotal, normalizeMaxPoints } from "@/lib/gradebook";
import supabase from "@/lib/supabase";
import type {
    AssignmentGroup,
    AssignmentSubmission,
    QuizSubmission,
    StudentGradebookScore,
    Subject,
} from "@/types";

type AssessmentRow = {
    key: string;
    kind: "assignment" | "quiz";
    title: string;
    subjectId: string;
    dueDate: string | null;
    status: string;
    groupName: string;
    groupWeightPercentage: number;
    periodLabel: string;
    countsTowardsFinal: boolean;
    rawScore: number | null;
    rawMax: number;
    percentage: number | null;
    earnedContribution: number | null;
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

const getPeriodLabel = (period?: string | null) => (period === "year" ? "Year" : "Term");

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

const getSubjectIcon = (subject: Subject) => {
    const name = `${subject.name} ${subject.category || ""}`.toLowerCase();
    if (name.includes("math") || name.includes("account")) return Calculator;
    return BookOpen;
};

export default function GradeManagement() {
    const { grades, students, registerClasses, subjectClasses, studentSubjects, studentSubjectClasses } = useRegistrationData();
    const { assignments, submissions: assignmentSubmissions } = useAssignments();
    const { subjects, quizzes, submissions: quizSubmissions } = useSubjects();

    const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
    const [gradebookScores, setGradebookScores] = useState<StudentGradebookScore[]>([]);
    const [selectedSubjectClassId, setSelectedSubjectClassId] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentSearch, setStudentSearch] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchGradebook = async () => {
            const [groupsRes, scoresRes] = await Promise.all([
                supabase.from("assignment_groups").select("*").order("order", { ascending: true }),
                supabase.from("student_gradebook_scores").select("*"),
            ]);

            if (groupsRes.error || scoresRes.error) {
                console.error("Failed to fetch principal gradebook data", {
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
    }, []);

    const scoreMap = useMemo(() => buildGradebookScoreMap(gradebookScores), [gradebookScores]);

    const subjectClassQueue = useMemo(() => {
        return subjectClasses
            .map((subjectClass) => {
                const subject = subjects.find((item) => item.id === subjectClass.subjectId);
                const grade = grades.find((item) => item.id === subjectClass.gradeId);
                const classStudentIds = new Set(
                    studentSubjectClasses
                        .filter((entry) => entry.subjectClassId === subjectClass.id)
                        .map((entry) => entry.studentId)
                );
                const classStudents = students
                    .filter((student) => classStudentIds.has(student.id))
                    .sort((a, b) => a.name.localeCompare(b.name));
                const groups = assignmentGroups
                    .filter((group) => group.subjectId === subjectClass.subjectId)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                return { subjectClass, subject, grade, classStudents, groups };
            })
            .sort((a, b) => a.subjectClass.name.localeCompare(b.subjectClass.name));
    }, [assignmentGroups, grades, studentSubjectClasses, students, subjectClasses, subjects]);

    useEffect(() => {
        if (!subjectClassQueue.length) {
            setSelectedSubjectClassId(null);
            return;
        }

        if (!selectedSubjectClassId || !subjectClassQueue.some((item) => item.subjectClass.id === selectedSubjectClassId)) {
            setSelectedSubjectClassId(subjectClassQueue[0].subjectClass.id);
        }
    }, [selectedSubjectClassId, subjectClassQueue]);

    const selectedSubjectClass = subjectClassQueue.find((item) => item.subjectClass.id === selectedSubjectClassId) || null;

    const filteredStudents = useMemo(() => {
        const query = studentSearch.trim().toLowerCase();
        return students
            .filter((student) => {
                if (!query) return true;
                return (
                    student.name.toLowerCase().includes(query) ||
                    student.email.toLowerCase().includes(query) ||
                    student.administrationNumber.toLowerCase().includes(query)
                );
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [studentSearch, students]);

    useEffect(() => {
        if (!filteredStudents.length) {
            setSelectedStudentId(null);
            return;
        }

        if (!selectedStudentId || !filteredStudents.some((student) => student.id === selectedStudentId)) {
            setSelectedStudentId(filteredStudents[0].id);
        }
    }, [filteredStudents, selectedStudentId]);

    const selectedStudent = filteredStudents.find((student) => student.id === selectedStudentId) || null;

    const latestAssignmentSubmissions = useMemo(() => {
        const map = new Map<string, AssignmentSubmission>();
        assignmentSubmissions.forEach((submission) => {
            const key = `${submission.studentId}:${submission.assignmentId}`;
            map.set(key, pickLatestAssignmentSubmission(map.get(key), submission));
        });
        return map;
    }, [assignmentSubmissions]);

    const latestQuizSubmissions = useMemo(() => {
        const map = new Map<string, QuizSubmission>();
        quizSubmissions.forEach((submission) => {
            const key = `${submission.studentId}:${submission.quizId}`;
            map.set(key, pickLatestQuizSubmission(map.get(key), submission));
        });
        return map;
    }, [quizSubmissions]);

    const selectedStudentSubjectIds = useMemo(() => {
        if (!selectedStudent) return [];

        const directAssignedIds = studentSubjects
            .filter((entry) => entry.studentId === selectedStudent.id)
            .map((entry) => entry.subjectId);

        const classAssignedIds = studentSubjectClasses
            .filter((entry) => entry.studentId === selectedStudent.id)
            .map((entry) => subjectClasses.find((subjectClass) => subjectClass.id === entry.subjectClassId)?.subjectId)
            .filter(Boolean) as string[];

        return Array.from(new Set([...directAssignedIds, ...classAssignedIds]));
    }, [selectedStudent, studentSubjectClasses, studentSubjects, subjectClasses]);

    const studentSubjectSummaries = useMemo(() => {
        if (!selectedStudent) return [];

        return selectedStudentSubjectIds
            .map((subjectId) => {
                const subject = subjects.find((item) => item.id === subjectId);
                if (!subject) return null;

                const subjectGroups = assignmentGroups
                    .filter((group) => group.subjectId === subjectId)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                return {
                    subject,
                    groups: subjectGroups,
                    yearMark: calculateWeightedGradebookTotal(subjectGroups, scoreMap, selectedStudent.id),
                    assessmentCount:
                        assignments.filter((assignment) => assignment.subjectId === subjectId && assignment.status === "published").length +
                        quizzes.filter((quiz) => quiz.subjectId === subjectId && quiz.status === "published").length,
                };
            })
            .filter(Boolean) as Array<{
                subject: Subject;
                groups: AssignmentGroup[];
                yearMark: number;
                assessmentCount: number;
            }>;
    }, [selectedStudent, selectedStudentSubjectIds, subjects, assignmentGroups, scoreMap, assignments, quizzes]);

    const studentAssessmentRows = useMemo(() => {
        if (!selectedStudent) return [] as AssessmentRow[];

        return selectedStudentSubjectIds.flatMap((subjectId) => {
            const subjectGroups = assignmentGroups
                .filter((group) => group.subjectId === subjectId)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            const groupNameById = new Map(subjectGroups.map((group) => [group.id, group.name]));
            const groupWeightById = new Map(subjectGroups.map((group) => [group.id, group.weightPercentage]));

            const assignmentRows: AssessmentRow[] = assignments
                .filter((assignment) => assignment.subjectId === subjectId && assignment.status === "published")
                .map((assignment) => {
                    const submission = latestAssignmentSubmissions.get(`${selectedStudent.id}:${assignment.id}`) || null;
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
                    if (submission?.status === "graded" && submission.isReleased) status = "Graded";
                    else if (submission) status = "Submitted";
                    else if (availableAt && availableAt > now) status = "Upcoming";
                    else if (dueAt < now) status = "Missing";

                    return {
                        key: `assignment:${assignment.id}`,
                        kind: "assignment",
                        title: assignment.title,
                        subjectId,
                        dueDate: assignment.dueDate,
                        status,
                        groupName: assignment.groupId ? (groupNameById.get(assignment.groupId) || "Unlinked") : "Unlinked",
                        groupWeightPercentage: assignment.groupId ? Number(groupWeightById.get(assignment.groupId) || 0) : 0,
                        periodLabel: getPeriodLabel(assignment.assessmentPeriod),
                        countsTowardsFinal: assignment.countsTowardsFinal ?? true,
                        rawScore,
                        rawMax,
                        percentage,
                        earnedContribution,
                    };
                });

            const quizRows: AssessmentRow[] = quizzes
                .filter((quiz) => quiz.subjectId === subjectId && quiz.status === "published")
                .map((quiz) => {
                    const submission = latestQuizSubmissions.get(`${selectedStudent.id}:${quiz.id}`) || null;
                    const rawScore = submission ? Number(submission.score || 0) : null;
                    const rawMax = Number(submission?.totalPoints || quiz.pointsPossible || 0);
                    const percentage = computePercentage(rawScore, rawMax);
                    const endDate = quiz.settings?.availability?.endDate || null;
                    const startDate = quiz.settings?.availability?.startDate || null;
                    const now = Date.now();
                    const startAt = startDate ? new Date(startDate).getTime() : null;
                    const endAt = endDate ? new Date(endDate).getTime() : null;

                    let status = "Open";
                    if (submission?.status === "completed") status = "Completed";
                    else if (submission?.status === "need-review") status = "Needs Review";
                    else if (startAt && startAt > now) status = "Upcoming";
                    else if (endAt && endAt < now) status = "Closed";

                    return {
                        key: `quiz:${quiz.id}`,
                        kind: "quiz",
                        title: quiz.title,
                        subjectId,
                        dueDate: endDate,
                        status,
                        groupName: quiz.groupId ? (groupNameById.get(quiz.groupId) || "Unlinked") : "Unlinked",
                        groupWeightPercentage: quiz.groupId ? Number(groupWeightById.get(quiz.groupId) || 0) : 0,
                        periodLabel: "Term",
                        countsTowardsFinal: quiz.countsTowardsFinal ?? true,
                        rawScore,
                        rawMax,
                        percentage,
                        earnedContribution: null,
                    };
                });

            return [...assignmentRows, ...quizRows];
        }).sort((a, b) => {
            const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return bTime - aTime;
        });
    }, [
        selectedStudent,
        selectedStudentSubjectIds,
        assignmentGroups,
        assignments,
        latestAssignmentSubmissions,
        latestQuizSubmissions,
        quizzes,
    ]);

    const gradeCards = grades.map((grade) => ({
        grade,
        gradeStudents: students.filter((student) => student.gradeId === grade.id),
        gradeRegClasses: registerClasses.filter((registerClass) => registerClass.gradeId === grade.id),
        gradeSubClasses: subjectClasses.filter((subjectClass) => subjectClass.gradeId === grade.id),
    }));

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight">Grade Management</h1>
                <p className="text-muted-foreground">
                    Review subject-class gradebooks and inspect any learner&apos;s full subject report using the same gradebook setup teachers use.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {gradeCards.map(({ grade, gradeStudents, gradeRegClasses, gradeSubClasses }) => (
                    <Card key={grade.id} className="relative overflow-hidden group border-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <GraduationCap className="h-24 w-24" />
                        </div>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-3xl font-black">{grade.name}</CardTitle>
                                    <Badge variant="secondary" className="mt-1">Level {grade.level}</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 rounded-xl bg-primary/5 text-center">
                                    <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                                    <div className="text-xl font-bold">{gradeStudents.length}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-black">Learners</div>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-500/5 text-center">
                                    <School className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                                    <div className="text-xl font-bold">{gradeRegClasses.length}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-black">Reg Classes</div>
                                </div>
                                <div className="p-3 rounded-xl bg-purple-500/5 text-center">
                                    <BookOpen className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                                    <div className="text-xl font-bold">{gradeSubClasses.length}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-black">Sub Classes</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs defaultValue="class-gradebooks" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:w-[420px]">
                    <TabsTrigger value="class-gradebooks">
                        <LayoutList className="mr-2 h-4 w-4" />
                        Class Gradebooks
                    </TabsTrigger>
                    <TabsTrigger value="student-report">
                        <UserRoundSearch className="mr-2 h-4 w-4" />
                        Student Report
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="class-gradebooks" className="space-y-6">
                    <div className="flex flex-wrap gap-3">
                        {subjectClassQueue.map(({ subjectClass, subject, classStudents, groups }) => (
                            <button
                                key={subjectClass.id}
                                type="button"
                                onClick={() => setSelectedSubjectClassId(subjectClass.id)}
                                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                    selectedSubjectClassId === subjectClass.id ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-muted/20 bg-card/60 hover:border-primary/40"
                                }`}
                            >
                                <p className="font-bold">{subjectClass.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {subject?.name || "Unknown Subject"} • {classStudents.length} learners • {groups.length} columns
                                </p>
                            </button>
                        ))}
                    </div>

                    {selectedSubjectClass ? (
                        <Card className="border-muted/20 bg-card/70">
                            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <FileChartColumn className="h-5 w-5 text-primary" />
                                        {selectedSubjectClass.subjectClass.name}
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedSubjectClass.subject?.name || "Unknown Subject"} • {selectedSubjectClass.grade?.name || "Unknown Grade"} • weighted from teacher gradebook setup
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{selectedSubjectClass.classStudents.length} learners</Badge>
                                    <Badge variant="outline">{selectedSubjectClass.groups.length} gradebook columns</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {selectedSubjectClass.groups.length > 0 ? (
                                    <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
                                        <table className="w-full min-w-[900px] text-sm">
                                            <thead className="bg-muted/30">
                                                <tr>
                                                    <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-black min-w-[260px]">Learner</th>
                                                    {selectedSubjectClass.groups.map((group) => (
                                                        <th key={group.id} className="px-3 py-3 text-center font-black min-w-[180px]">
                                                            <div className="space-y-1">
                                                                <p>{group.name}</p>
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
                                                {selectedSubjectClass.classStudents.map((student) => (
                                                    <tr key={student.id} className="border-t">
                                                        <td className="sticky left-0 z-10 bg-background px-4 py-3">
                                                            <div>
                                                                <p className="font-bold">{student.name}</p>
                                                                <p className="text-xs text-muted-foreground">{student.administrationNumber}</p>
                                                            </div>
                                                        </td>
                                                        {selectedSubjectClass.groups.map((group) => {
                                                            const entry = scoreMap[`${student.id}:${group.id}`];
                                                            return (
                                                                <td key={`${student.id}:${group.id}`} className="px-3 py-3 text-center">
                                                                    {entry ? (
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold">{formatNumber(entry.score)} / {formatNumber(normalizeMaxPoints(group.maxPoints))}</p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                {((entry.score / normalizeMaxPoints(group.maxPoints)) * 100).toFixed(1)}%
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">Not scored</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="sticky right-0 z-10 bg-background px-4 py-3 text-center">
                                                            <Badge className="bg-green-600 text-white">
                                                                {calculateWeightedGradebookTotal(selectedSubjectClass.groups, scoreMap, student.id).toFixed(1)}%
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                ) : (
                                    <div className="rounded-xl border border-dashed bg-background/50 p-5 text-sm text-muted-foreground">
                                        This subject class does not have a teacher gradebook setup yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </TabsContent>

                <TabsContent value="student-report" className="space-y-6">
                    <Card className="border-muted/20 bg-card/70">
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="text-2xl">Learner Grade Report</CardTitle>
                                <CardDescription>
                                    Full cross-subject summary for a selected learner, aligned to the gradebook setup configured by teachers.
                                </CardDescription>
                            </div>
                            <Input
                                value={studentSearch}
                                onChange={(event) => setStudentSearch(event.target.value)}
                                placeholder="Search learner by name, email, or admin number"
                                className="md:max-w-sm"
                            />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-wrap gap-3">
                                {filteredStudents.slice(0, 24).map((student) => (
                                    <button
                                        key={student.id}
                                        type="button"
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                            selectedStudentId === student.id ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-muted/20 bg-card/60 hover:border-primary/40"
                                        }`}
                                    >
                                        <p className="font-bold">{student.name}</p>
                                        <p className="text-xs text-muted-foreground">{student.administrationNumber} • {student.email}</p>
                                    </button>
                                ))}
                            </div>

                            {selectedStudent ? (
                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-2xl border p-4">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Learner</p>
                                            <p className="mt-2 text-2xl font-black">{selectedStudent.name}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{selectedStudent.email}</p>
                                        </div>
                                        <div className="rounded-2xl border p-4">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Administration Number</p>
                                            <p className="mt-2 text-2xl font-black">{selectedStudent.administrationNumber}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{selectedStudent.grade}</p>
                                        </div>
                                        <div className="rounded-2xl border p-4">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Assigned Subjects</p>
                                            <p className="mt-2 text-2xl font-black">{studentSubjectSummaries.length}</p>
                                            <p className="text-sm text-muted-foreground mt-1">Across direct and class-linked enrollment</p>
                                        </div>
                                        <div className="rounded-2xl border p-4">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Published Assessments</p>
                                            <p className="mt-2 text-2xl font-black">{studentAssessmentRows.length}</p>
                                            <p className="text-sm text-muted-foreground mt-1">Assignments and quizzes in the report</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {studentSubjectSummaries.map(({ subject, groups, yearMark, assessmentCount }) => {
                                            const SubjectIcon = getSubjectIcon(subject);
                                            return (
                                                <Card key={subject.id} className="border-muted/20 bg-card/60">
                                                    <CardContent className="p-5 space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                                <SubjectIcon className="h-6 w-6" />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-lg">{subject.name}</p>
                                                                <p className="text-sm text-muted-foreground">Grade {subject.gradeTier}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Badge variant="secondary">{groups.length} gradebook columns</Badge>
                                                            <Badge variant="outline">{assessmentCount} assessments</Badge>
                                                        </div>
                                                        <div className="rounded-2xl border bg-background/60 p-4">
                                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Year Mark</p>
                                                            <p className="mt-2 text-3xl font-black">{yearMark.toFixed(1)}%</p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    <Card className="border-muted/20 bg-card/60">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <ClipboardList className="h-4 w-4 text-primary" />
                                                Assessment Breakdown
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {studentAssessmentRows.length > 0 ? (
                                                <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
                                                    <table className="w-full min-w-[1200px] text-sm">
                                                        <thead className="bg-muted/30">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-black min-w-[200px]">Subject</th>
                                                                <th className="px-4 py-3 text-left font-black min-w-[240px]">Assessment</th>
                                                                <th className="px-4 py-3 text-left font-black min-w-[120px]">Due Date</th>
                                                                <th className="px-4 py-3 text-left font-black min-w-[120px]">Status</th>
                                                                <th className="px-4 py-3 text-left font-black min-w-[160px]">Gradebook Column</th>
                                                                <th className="px-4 py-3 text-left font-black min-w-[140px]">Grade</th>
                                                                <th className="px-4 py-3 text-left font-black min-w-[170px]">Final Mark Impact</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentAssessmentRows.map((row) => {
                                                                const subject = subjects.find((item) => item.id === row.subjectId);
                                                                return (
                                                                    <tr key={row.key} className="border-t">
                                                                        <td className="px-4 py-4 font-bold">{subject?.name || "Unknown Subject"}</td>
                                                                        <td className="px-4 py-4">
                                                                            <div className="space-y-1">
                                                                                <p className="font-bold">{row.title}</p>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    <Badge variant="secondary" className="capitalize">{row.kind}</Badge>
                                                                                    <Badge variant="outline">{row.periodLabel}</Badge>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 text-muted-foreground">{formatDate(row.dueDate)}</td>
                                                                        <td className="px-4 py-4">
                                                                            <Badge className={getBadgeClassName(row.status)}>{row.status}</Badge>
                                                                        </td>
                                                                        <td className="px-4 py-4">
                                                                            <div className="space-y-1">
                                                                                <p className="font-semibold">{row.groupName}</p>
                                                                                <p className="text-xs text-muted-foreground">{formatNumber(row.groupWeightPercentage)}% gradebook weight</p>
                                                                            </div>
                                                                        </td>
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
                                                                                    <p className="text-xs text-muted-foreground">Toward {row.periodLabel.toLowerCase()} mark</p>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="space-y-1">
                                                                                    <p className="font-bold text-muted-foreground">{row.countsTowardsFinal ? "Tracked" : "Excluded"}</p>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {row.countsTowardsFinal ? "Waiting for weighted contribution" : "Not included in final mark"}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </ScrollArea>
                                            ) : (
                                                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                                                    No published assignments or quizzes are available for this learner yet.
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                                    Select a learner to inspect their full grade report.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

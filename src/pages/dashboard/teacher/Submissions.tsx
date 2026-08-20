import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    BarChart3,
    Bot,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAssignments } from "@/hooks/useAssignments";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useSubjects } from "@/hooks/useSubjects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SubmissionCategory = "ungraded" | "graded" | "auto-graded";

type SubmissionRow = {
    id: string;
    category: SubmissionCategory;
    assessmentType: "assessment" | "quiz";
    title: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    classIds: string[];
    classNames: string[];
    submittedAt?: string;
    statusLabel: string;
    score?: number;
    maxScore?: number;
    actionPath: string;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

function formatSubmissionDate(value?: string) {
    if (!value) return "No completion date";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : dateFormatter.format(date);
}

function getTimestamp(value?: string) {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function Submissions() {
    const { user } = useAuth();
    const {
        assignments,
        submissions: assignmentSubmissions,
        loading: assignmentsLoading,
    } = useAssignments();
    const {
        subjects,
        quizzes,
        submissions: quizSubmissions,
        loading: subjectsLoading,
    } = useSubjects();
    const { teachers } = useSchoolData();
    const {
        subjectClasses,
        studentSubjectClasses,
        loading: registrationLoading,
    } = useRegistrationData();

    const [activeCategory, setActiveCategory] = useState<SubmissionCategory>("ungraded");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("all");
    const [selectedClassId, setSelectedClassId] = useState("all");

    const teacherProfile = useMemo(
        () => teachers.find((teacher) => teacher.id === user?.id),
        [teachers, user?.id]
    );
    const teacherSubjectIds = useMemo(
        () => teacherProfile?.subjects || [],
        [teacherProfile]
    );

    const teacherSubjects = useMemo(
        () => subjects
            .filter((subject) => teacherSubjectIds.includes(subject.id))
            .sort((a, b) => a.name.localeCompare(b.name)),
        [subjects, teacherSubjectIds]
    );

    const teacherSubjectClasses = useMemo(
        () => subjectClasses
            .filter((subjectClass) => teacherSubjectIds.includes(subjectClass.subjectId))
            .sort((a, b) => a.name.localeCompare(b.name)),
        [subjectClasses, teacherSubjectIds]
    );

    const classOptions = useMemo(
        () => teacherSubjectClasses.filter((subjectClass) => (
            selectedSubjectId === "all" || subjectClass.subjectId === selectedSubjectId
        )),
        [selectedSubjectId, teacherSubjectClasses]
    );

    const submissionRows = useMemo<SubmissionRow[]>(() => {
        const subjectIdSet = new Set(teacherSubjectIds);
        const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));
        const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
        const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
        const subjectClassById = new Map(teacherSubjectClasses.map((subjectClass) => [subjectClass.id, subjectClass]));

        const findStudentClasses = (studentId: string, subjectId: string) => {
            const classes = studentSubjectClasses
                .filter((entry) => entry.studentId === studentId)
                .map((entry) => subjectClassById.get(entry.subjectClassId))
                .filter((subjectClass) => subjectClass?.subjectId === subjectId);

            return {
                classIds: classes.map((subjectClass) => subjectClass!.id),
                classNames: classes.map((subjectClass) => subjectClass!.name),
            };
        };

        const manualRows = assignmentSubmissions.flatMap<SubmissionRow>((submission) => {
            const assignment = assignmentById.get(submission.assignmentId);
            if (!assignment || !subjectIdSet.has(assignment.subjectId)) return [];

            const studentClasses = findStudentClasses(submission.studentId, assignment.subjectId);
            const isGraded = submission.status === "graded";

            return [{
                id: `assignment-${submission.id}`,
                category: isGraded ? "graded" : "ungraded",
                assessmentType: "assessment",
                title: assignment.title,
                studentName: submission.studentName,
                subjectId: assignment.subjectId,
                subjectName: subjectNameById.get(assignment.subjectId) || "Unknown subject",
                ...studentClasses,
                submittedAt: submission.submittedAt,
                statusLabel: isGraded
                    ? (submission.isReleased ? "Graded & released" : "Graded")
                    : (submission.status === "draft" ? "Draft grade" : "Needs grading"),
                score: isGraded ? Number(submission.totalGrade || 0) : undefined,
                maxScore: isGraded ? Number(assignment.totalMarks || 0) : undefined,
                actionPath: `/teacher/assignments/${assignment.id}/grade`,
            }];
        });

        const automaticRows = quizSubmissions.flatMap<SubmissionRow>((submission) => {
            const quiz = quizById.get(submission.quizId);
            if (!quiz || !subjectIdSet.has(quiz.subjectId)) return [];

            const studentClasses = findStudentClasses(submission.studentId, quiz.subjectId);
            const isCompleted = submission.status === "completed";

            return [{
                id: `quiz-${submission.id}`,
                category: isCompleted ? "auto-graded" : "ungraded",
                assessmentType: "quiz",
                title: quiz.title,
                studentName: submission.studentName,
                subjectId: quiz.subjectId,
                subjectName: subjectNameById.get(quiz.subjectId) || "Unknown subject",
                ...studentClasses,
                submittedAt: submission.completedAt,
                statusLabel: isCompleted
                    ? "Auto-graded"
                    : (submission.status === "need-review" ? "Needs review" : "In progress"),
                score: isCompleted ? Number(submission.score || 0) : undefined,
                maxScore: isCompleted ? Number(submission.totalPoints || quiz.pointsPossible || 0) : undefined,
                actionPath: `/teacher/assignments/quizzes/${quiz.id}/analytics`,
            }];
        });

        return [...manualRows, ...automaticRows]
            .sort((a, b) => getTimestamp(b.submittedAt) - getTimestamp(a.submittedAt));
    }, [
        assignmentSubmissions,
        assignments,
        quizSubmissions,
        quizzes,
        studentSubjectClasses,
        subjects,
        teacherSubjectClasses,
        teacherSubjectIds,
    ]);

    const categoryCounts = useMemo(() => ({
        ungraded: submissionRows.filter((row) => row.category === "ungraded").length,
        graded: submissionRows.filter((row) => row.category === "graded").length,
        "auto-graded": submissionRows.filter((row) => row.category === "auto-graded").length,
    }), [submissionRows]);

    const filteredRows = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return submissionRows.filter((row) => {
            if (row.category !== activeCategory) return false;
            if (selectedSubjectId !== "all" && row.subjectId !== selectedSubjectId) return false;
            if (selectedClassId !== "all" && !row.classIds.includes(selectedClassId)) return false;
            if (!normalizedQuery) return true;

            return [row.title, row.studentName, row.subjectName, ...row.classNames]
                .some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [activeCategory, searchQuery, selectedClassId, selectedSubjectId, submissionRows]);

    const isLoading = assignmentsLoading || subjectsLoading || registrationLoading;
    const activeLabel = activeCategory === "ungraded"
        ? "ungraded"
        : activeCategory === "graded" ? "graded" : "auto-graded";

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <Button asChild variant="ghost" size="sm" className="-ml-3 mb-1">
                        <Link to="/teacher/assignments/queue">
                            <ArrowLeft />
                            Back to gradebook
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
                    <p className="max-w-2xl text-muted-foreground">
                        Review manual marking work and completed auto-graded quizzes in one focused queue.
                    </p>
                </div>
            </div>

            <Card className="border-muted/20 bg-card/70">
                <CardContent className="space-y-5 pt-6">
                    <Tabs
                        value={activeCategory}
                        onValueChange={(value) => setActiveCategory(value as SubmissionCategory)}
                    >
                        <TabsList className="grid h-auto w-full grid-cols-3 p-1">
                            <TabsTrigger value="ungraded" className="min-h-10">
                                <ClipboardCheck />
                                <span className="hidden sm:inline">Ungraded</span>
                                <Badge variant="secondary">{categoryCounts.ungraded}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="graded" className="min-h-10">
                                <CheckCircle2 />
                                <span className="hidden sm:inline">Graded</span>
                                <Badge variant="secondary">{categoryCounts.graded}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="auto-graded" className="min-h-10">
                                <Bot />
                                <span className="hidden sm:inline">Auto-graded</span>
                                <Badge variant="secondary">{categoryCounts["auto-graded"]}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search learner or assessment"
                                className="pl-9"
                                aria-label="Search submissions"
                            />
                        </div>
                        <Select
                            value={selectedSubjectId}
                            onValueChange={(value) => {
                                setSelectedSubjectId(value);
                                setSelectedClassId("all");
                            }}
                        >
                            <SelectTrigger className="w-full" aria-label="Filter by subject">
                                <SelectValue placeholder="All subjects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All subjects</SelectItem>
                                {teacherSubjects.map((subject) => (
                                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger className="w-full" aria-label="Filter by class">
                                <SelectValue placeholder="All classes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All classes</SelectItem>
                                {classOptions.map((subjectClass) => (
                                    <SelectItem key={subjectClass.id} value={subjectClass.id}>{subjectClass.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-muted/20 bg-card/70">
                <CardHeader>
                    <CardTitle className="text-lg capitalize">{activeLabel} submissions</CardTitle>
                    <CardDescription>
                        {isLoading ? "Loading submissions..." : `${filteredRows.length} ${filteredRows.length === 1 ? "submission" : "submissions"} shown`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)}
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-background/40 px-6 text-center">
                            <CheckCircle2 className="mb-3 h-9 w-9 text-muted-foreground" />
                            <p className="font-bold">No {activeLabel} submissions found</p>
                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                {searchQuery || selectedSubjectId !== "all" || selectedClassId !== "all"
                                    ? "Try clearing or changing the current filters."
                                    : "New submissions will appear here when learners complete their work."}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y rounded-xl border bg-background/40">
                            {filteredRows.map((row) => (
                                <article key={row.id} className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex min-w-0 gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            {row.assessmentType === "assessment" ? <FileText /> : <Bot />}
                                        </div>
                                        <div className="min-w-0 space-y-2">
                                            <div>
                                                <p className="truncate font-bold">{row.title}</p>
                                                <p className="text-sm text-muted-foreground">{row.studentName}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">{row.subjectName}</Badge>
                                                {row.classNames.length > 0 ? row.classNames.map((className) => (
                                                    <Badge key={className} variant="secondary">{className}</Badge>
                                                )) : <Badge variant="secondary">Class not assigned</Badge>}
                                                <Badge
                                                    className={row.category === "ungraded"
                                                        ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200"
                                                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"}
                                                >
                                                    {row.statusLabel}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                                        <div className="text-sm sm:text-right">
                                            {row.score !== undefined && (
                                                <p className="font-black">
                                                    {row.score}{row.maxScore ? ` / ${row.maxScore}` : ""}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">{formatSubmissionDate(row.submittedAt)}</p>
                                        </div>
                                        <Button asChild size="sm" variant={row.category === "ungraded" ? "default" : "outline"}>
                                            <Link to={row.actionPath}>
                                                {row.assessmentType === "assessment" ? <ClipboardCheck /> : <BarChart3 />}
                                                {row.category === "ungraded" && row.assessmentType === "assessment"
                                                    ? "Grade"
                                                    : row.assessmentType === "quiz" ? "View analytics" : "Review"}
                                            </Link>
                                        </Button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

import { useAssignments } from "@/hooks/useAssignments";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, ChevronRight, PenTool, Lock, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { buildGradebookScoreMap, calculateWeightedGradebookTotal, normalizeMaxPoints } from "@/lib/gradebook";
import type { AssignmentGroup, StudentGradebookScore } from "@/types";

export default function StudentAssignments() {
    const { user } = useAuth();
    const { studentSubjects, studentSubjectClasses, subjectClasses } = useRegistrationData();
    const { assignments: allAssignments, submissions } = useAssignments();
    const { subjects: allSubjects } = useSubjects();
    const navigate = useNavigate();

    const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
    const [gradebookScores, setGradebookScores] = useState<StudentGradebookScore[]>([]);

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
                supabase
                    .from("assignment_groups")
                    .select("*")
                    .in("subject_id", assignedIds)
                    .order("order", { ascending: true }),
                supabase
                    .from("student_gradebook_scores")
                    .select("*")
                    .eq("student_id", user.id)
                    .in("subject_id", assignedIds),
            ]);

            if (groupsRes.error || scoresRes.error) {
                console.error("Failed to fetch learner gradebook", {
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
    }, [assignedIds.join(","), user?.id]);

    const assignments = useMemo(() => (
        allAssignments
            .filter((assignment) => assignedIds.includes(assignment.subjectId))
            .sort((a, b) => new Date(a.availableFrom || a.dueDate).getTime() - new Date(b.availableFrom || b.dueDate).getTime())
    ), [allAssignments, assignedIds]);

    const studentSubmissions = submissions.filter((submission) => submission.studentId === user?.id);
    const scoreMap = useMemo(() => buildGradebookScoreMap(gradebookScores), [gradebookScores]);

    const subjectSections = useMemo(() => {
        return allSubjects
            .filter((subject) => assignedIds.includes(subject.id))
            .map((subject) => ({
                subject,
                subjectAssignments: assignments.filter((assignment) => assignment.subjectId === subject.id),
                gradebookColumns: assignmentGroups
                    .filter((group) => group.subjectId === subject.id)
                    .sort((a, b) => (a.order || 0) - (b.order || 0)),
            }));
    }, [allSubjects, assignedIds, assignments, assignmentGroups]);

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-8 py-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight">Assessments & Gradebook</h1>
                <p className="text-xl text-muted-foreground mt-2">Track your yearly mark by subject, then open assessments once they are available.</p>
            </div>

            <div className="space-y-8">
                {subjectSections.map(({ subject, subjectAssignments, gradebookColumns }) => (
                    <section key={subject.id} className="space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{subject.name}</h2>
                                <p className="text-sm text-muted-foreground">Grade {subject.gradeTier} yearly tracking</p>
                            </div>
                            {gradebookColumns.length > 0 ? (
                                <Badge variant="secondary">
                                    Current Year Mark: {calculateWeightedGradebookTotal(gradebookColumns, scoreMap, user?.id || "").toFixed(1)}%
                                </Badge>
                            ) : null}
                        </div>

                        {gradebookColumns.length > 0 ? (
                            <Card className="border-muted/20 bg-card/70">
                                <CardHeader>
                                    <CardTitle className="text-lg">My Gradebook</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="w-full whitespace-nowrap rounded-xl border">
                                        <table className="w-full min-w-[760px] text-sm">
                                            <thead className="bg-muted/30">
                                                <tr>
                                                    {gradebookColumns.map((group) => (
                                                        <th key={group.id} className="px-4 py-3 text-left font-black min-w-[180px]">
                                                            <div className="space-y-1">
                                                                <p>{group.name}</p>
                                                                <p className="text-[10px] text-muted-foreground">/{normalizeMaxPoints(group.maxPoints)} • {group.weightPercentage}%</p>
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th className="px-4 py-3 text-center font-black min-w-[140px]">Year Mark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t">
                                                    {gradebookColumns.map((group) => {
                                                        const entry = scoreMap[`${user?.id}:${group.id}`];
                                                        return (
                                                            <td key={group.id} className="px-4 py-4">
                                                                <div className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                                                                    {entry ? `${entry.score} / ${normalizeMaxPoints(group.maxPoints)}` : `- / ${normalizeMaxPoints(group.maxPoints)}`}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-4 text-center">
                                                        <Badge className="bg-green-600 text-white">
                                                            {calculateWeightedGradebookTotal(gradebookColumns, scoreMap, user?.id || "").toFixed(1)}%
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        ) : null}

                        <div className="grid gap-6">
                            {subjectAssignments.map((assignment) => {
                                const submission = studentSubmissions.find((item) => item.assignmentId === assignment.id);
                                const availableFrom = new Date(assignment.availableFrom || assignment.createdAt);
                                const dueDate = new Date(assignment.dueDate);
                                const isOpen = availableFrom.getTime() <= Date.now();
                                const isDueSoon = dueDate.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && dueDate.getTime() > Date.now();
                                const isGraded = submission?.status === "graded" && submission.isReleased;

                                return (
                                    <Card key={assignment.id} className="group transition-all duration-300 border-none bg-card/50 backdrop-blur-sm shadow-premium overflow-hidden">
                                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                                                        {assignment.assessmentCategory || "assessment"}
                                                    </Badge>
                                                    {isGraded ? (
                                                        <Badge className="bg-green-500">Graded</Badge>
                                                    ) : submission ? (
                                                        <Badge className="bg-blue-500">Submitted</Badge>
                                                    ) : !isOpen ? (
                                                        <Badge variant="outline">Upcoming</Badge>
                                                    ) : isDueSoon ? (
                                                        <Badge variant="outline" className="text-destructive border-destructive">Due Soon</Badge>
                                                    ) : (
                                                        <Badge variant="outline">Open</Badge>
                                                    )}
                                                </div>
                                                <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                                                    {assignment.title}
                                                </CardTitle>
                                                <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Opens {format(availableFrom, "PPP")}</span>
                                                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Due {format(dueDate, "PPP")}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1">
                                                    Max Marks: {assignment.totalMarks}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pb-4">
                                            <p className="text-muted-foreground line-clamp-2 italic text-sm mb-4">
                                                {(assignment.description || "No description provided for this assessment.")
                                                    .replace(/<[^>]*>/g, " ")
                                                    .replace(/&nbsp;/g, " ")
                                                    .replace(/\s+/g, " ")
                                                    .trim()}
                                            </p>

                                            {isGraded && (
                                                <div className="mt-4 p-4 rounded-xl bg-green-50/50 border border-green-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                        <div>
                                                            <p className="text-sm font-bold text-green-900">Released Grade</p>
                                                            <p className="text-xs text-green-700">Visible in your assessment record</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-2xl font-black text-green-600">
                                                        {submission.totalGrade} / {assignment.totalMarks}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="bg-muted/30 pt-4">
                                            <Button
                                                className="w-full font-bold gap-2"
                                                variant={isOpen ? "default" : "outline"}
                                                disabled={!isOpen}
                                                onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                                            >
                                                {isOpen ? (submission ? (isGraded ? "View Feedback" : "Open Assessment") : "Start Assessment") : "Available On Release Date"}
                                                {isOpen ? <ChevronRight className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {subjectSections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl">
                        <PenTool className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground">No assessments or gradebook setup have been posted yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

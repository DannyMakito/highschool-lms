import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Calculator, ChevronRight, FlaskConical, Landmark, Palette, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { buildGradebookScoreMap, calculateWeightedGradebookTotal, normalizeMaxPoints } from "@/lib/gradebook";
import supabase from "@/lib/supabase";
import type { AssignmentGroup, StudentGradebookScore, Subject } from "@/types";

const getSubjectIcon = (subject: Subject) => {
    const name = `${subject.name} ${subject.category || ""}`.toLowerCase();
    if (name.includes("math") || name.includes("account")) return Calculator;
    if (name.includes("science") || name.includes("physics") || name.includes("chem")) return FlaskConical;
    if (name.includes("history") || name.includes("geo")) return Landmark;
    if (name.includes("art") || name.includes("design")) return Palette;
    if (name.includes("english") || name.includes("literature")) return ScrollText;
    return BookOpen;
};

export default function StudentGrades() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { studentSubjects, studentSubjectClasses, subjectClasses } = useRegistrationData();
    const { subjects: allSubjects } = useSubjects();

    const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
    const [gradebookScores, setGradebookScores] = useState<StudentGradebookScore[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

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
    }, [assignedIds.join(","), user?.id]);

    const subjects = useMemo(() => (
        allSubjects.filter((subject) => assignedIds.includes(subject.id))
    ), [allSubjects, assignedIds]);

    useEffect(() => {
        if (!subjects.length) {
            setSelectedSubjectId(null);
            return;
        }

        if (!selectedSubjectId || !subjects.some((subject) => subject.id === selectedSubjectId)) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [selectedSubjectId, subjects]);

    const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) || null;
    const gradebookColumns = assignmentGroups
        .filter((group) => group.subjectId === selectedSubjectId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    const scoreMap = useMemo(() => buildGradebookScoreMap(gradebookScores), [gradebookScores]);

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-8 py-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight">My Grades</h1>
                <p className="text-xl text-muted-foreground mt-2">
                    Open a subject to see its gradebook table, yearly mark, and assessment details in one place.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {subjects.map((subject) => {
                    const SubjectIcon = getSubjectIcon(subject);
                    const subjectGroups = assignmentGroups
                        .filter((group) => group.subjectId === subject.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    const total = calculateWeightedGradebookTotal(subjectGroups, scoreMap, user?.id || "");
                    const isSelected = subject.id === selectedSubjectId;

                    return (
                        <button
                            key={subject.id}
                            type="button"
                            onClick={() => setSelectedSubjectId(subject.id)}
                            className={`text-left rounded-3xl border transition-all ${isSelected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-muted/20 bg-card/70 hover:border-primary/40"}`}
                        >
                            <div className="p-6 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <SubjectIcon className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black">{subject.name}</h2>
                                            <p className="text-sm text-muted-foreground">Grade {subject.gradeTier}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{subjectGroups.length} grade items</Badge>
                                    <Badge variant="outline">{total.toFixed(1)}% year mark</Badge>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedSubject ? (
                <Card className="border-muted/20 bg-card/70">
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="text-2xl">{selectedSubject.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">Gradebook breakdown for this subject</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-green-600 text-white">
                                Year Mark: {calculateWeightedGradebookTotal(gradebookColumns, scoreMap, user?.id || "").toFixed(1)}%
                            </Badge>
                            <Button type="button" variant="outline" onClick={() => navigate("/student/assignments")}>
                                View Assessments
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {gradebookColumns.length > 0 ? (
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
                        ) : (
                            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                                Your teacher has not configured this subject gradebook yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-3xl border-2 border-dashed py-20 text-center text-muted-foreground">
                    No subject grades are available yet.
                </div>
            )}
        </div>
    );
}

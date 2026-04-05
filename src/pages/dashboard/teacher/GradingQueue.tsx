import { useMemo } from "react";
import { useAssignments } from "@/hooks/useAssignments";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, Clock3, FileText, Layers3, Users } from "lucide-react";

export default function GradingQueue() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { assignments, submissions } = useAssignments();
    const { subjects, quizzes, submissions: quizSubmissions } = useSubjects();
    const { teachers } = useSchoolData();
    const { subjectClasses, studentSubjectClasses, students } = useRegistrationData();

    const teacherProfile = useMemo(() => teachers.find(t => t.id === user?.id), [teachers, user?.id]);
    const teacherSubjectIds = teacherProfile?.subjects || [];
    const teacherSubjects = subjects.filter(subject => teacherSubjectIds.includes(subject.id));
    const teacherSubjectClasses = subjectClasses.filter(subjectClass => teacherSubjectIds.includes(subjectClass.subjectId));

    const subjectQueue = teacherSubjects.map(subject => {
        const subjectAssignments = assignments.filter(assignment => assignment.subjectId === subject.id);
        const subjectQuizzes = quizzes.filter(quiz => quiz.subjectId === subject.id);
        const classes = teacherSubjectClasses.filter(subjectClass => subjectClass.subjectId === subject.id);

        const classQueue = classes.map(subjectClass => {
            const classStudentIds = new Set(
                studentSubjectClasses
                    .filter(item => item.subjectClassId === subjectClass.id)
                    .map(item => item.studentId)
            );

            const pendingAssignments = submissions.filter(submission => {
                const assignment = subjectAssignments.find(item => item.id === submission.assignmentId);
                return assignment && classStudentIds.has(submission.studentId) && submission.status !== "graded";
            });

            const gradedAssignments = submissions.filter(submission => {
                const assignment = subjectAssignments.find(item => item.id === submission.assignmentId);
                return assignment && classStudentIds.has(submission.studentId) && submission.status === "graded";
            });

            const pendingQuizSubmissions = quizSubmissions.filter(submission => {
                const quiz = subjectQuizzes.find(item => item.id === submission.quizId);
                return quiz && classStudentIds.has(submission.studentId) && submission.status !== "completed";
            });

            const historicalQuizSubmissions = quizSubmissions.filter(submission => {
                const quiz = subjectQuizzes.find(item => item.id === submission.quizId);
                return quiz && classStudentIds.has(submission.studentId) && submission.status === "completed";
            });

            return {
                subjectClass,
                pendingAssignments,
                gradedAssignments,
                pendingQuizSubmissions,
                historicalQuizSubmissions
            };
        });

        return {
            subject,
            subjectAssignments,
            subjectQuizzes,
            classQueue
        };
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Grading Queue</h1>
                <p className="text-muted-foreground">Review submitted work by subject, then by class, without mixing learners across classes.</p>
            </div>

            <div className="space-y-6">
                {subjectQueue.map(({ subject, subjectAssignments, subjectQuizzes, classQueue }) => (
                    <section key={subject.id} className="space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">{subject.name}</h2>
                                <p className="text-sm text-muted-foreground">Grade {subject.gradeTier}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{subjectAssignments.length} assessments</Badge>
                                <Badge variant="outline">{subjectQuizzes.length} quizzes</Badge>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            {classQueue.map(({ subjectClass, pendingAssignments, gradedAssignments, pendingQuizSubmissions, historicalQuizSubmissions }) => (
                                <Card key={subjectClass.id} className="border-muted/20 bg-card/60">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Layers3 className="h-4 w-4 text-primary" />
                                            {subjectClass.name}
                                        </CardTitle>
                                        <CardDescription className="flex flex-wrap gap-2">
                                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {studentSubjectClasses.filter(item => item.subjectClassId === subjectClass.id).length} learners</span>
                                            <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {pendingAssignments.length + pendingQuizSubmissions.length} pending</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Pending Assessments</p>
                                                <p className="mt-2 text-2xl font-black">{pendingAssignments.length}</p>
                                            </div>
                                            <div className="rounded-xl border bg-background/70 p-4">
                                                <p className="font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Grade History</p>
                                                <p className="mt-2 text-2xl font-black">{gradedAssignments.length + historicalQuizSubmissions.length}</p>
                                            </div>
                                        </div>

                                        {pendingAssignments.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ready to mark</p>
                                                {pendingAssignments.slice(0, 4).map(submission => {
                                                    const assignment = assignments.find(item => item.id === submission.assignmentId);
                                                    const student = students.find(item => item.id === submission.studentId);
                                                    return (
                                                        <div key={submission.id} className="flex items-center justify-between rounded-xl border bg-background/70 p-3">
                                                            <div>
                                                                <p className="font-bold">{assignment?.title || "Assessment"}</p>
                                                                <p className="text-xs text-muted-foreground">{student?.name || submission.studentName}</p>
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

                                        {pendingAssignments.length === 0 && pendingQuizSubmissions.length === 0 && (
                                            <div className="rounded-xl border border-dashed bg-background/50 p-4 text-sm text-muted-foreground">
                                                No pending grading items in this class right now.
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            {subjectAssignments.length > 0 && (
                                                <Button variant="outline" onClick={() => navigate(`/teacher/assignments/essays`)}>
                                                    Open Assessments
                                                </Button>
                                            )}
                                            {subjectQuizzes.length > 0 && (
                                                <Button variant="outline" onClick={() => navigate(`/teacher/assignments/quizzes`)}>
                                                    Open Quiz Area
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {classQueue.length === 0 && (
                                <Card className="border-muted/20 bg-card/60">
                                    <CardContent className="py-10 text-sm text-muted-foreground">
                                        No subject classes are assigned for this subject yet.
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </section>
                ))}

                {subjectQueue.length === 0 && (
                    <Card className="border-muted/20 bg-card/60">
                        <CardContent className="py-16 text-center text-muted-foreground">
                            No teacher subjects were found for the grading queue.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

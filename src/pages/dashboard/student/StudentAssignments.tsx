
import { useState } from "react";
import { useAssignments } from "@/hooks/useAssignments";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, AlertCircle, ChevronRight, PenTool } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";

export default function StudentAssignments() {
    const { user } = useAuth();
    const { studentSubjects } = useRegistrationData();
    const { assignments: allAssignments, submissions } = useAssignments();
    const { subjects: allSubjects } = useSubjects();
    const navigate = useNavigate();

    const assignments = useMemo(() => {
        const assignedIds = studentSubjects
            .filter(ss => ss.studentId === user?.id)
            .map(ss => ss.subjectId);
        return allAssignments.filter(a => assignedIds.includes(a.subjectId));
    }, [allAssignments, studentSubjects, user?.id]);

    const subjects = allSubjects; // mapping help for the loop below if needed, but the loop uses `subjects.find`
    const studentSubmissions = submissions.filter(s => s.studentId === user?.id);

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-8 py-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight">My Assignments</h1>
                <p className="text-xl text-muted-foreground mt-2">Track your essays, research projects, and graded feedback.</p>
            </div>

            <div className="grid gap-6">
                {assignments.map((assignment) => {
                    const submission = studentSubmissions.find(s => s.assignmentId === assignment.id);
                    const subject = subjects.find(s => s.id === assignment.subjectId);
                    const isDueSoon = new Date(assignment.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

                    return (
                        <Card key={assignment.id} className="group hover:shadow-premium-hover transition-all duration-300 border-none bg-card/50 backdrop-blur-sm shadow-premium overflow-hidden">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                                            {subject?.name}
                                        </Badge>
                                        {submission ? (
                                            <Badge className={submission.status === "graded" ? "bg-green-500" : "bg-blue-500"}>
                                                {submission.status === "graded" ? "Graded" : "Submitted"}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className={isDueSoon ? "text-destructive border-destructive" : ""}>
                                                {isDueSoon ? "Due Soon" : "Pending"}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                                        {assignment.title}
                                    </CardTitle>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-muted-foreground flex items-center justify-end gap-2">
                                        <Clock className="h-4 w-4" />
                                        {format(new Date(assignment.dueDate), "MMM d, p")}
                                    </div>
                                    <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1">
                                        Max Marks: {assignment.totalMarks}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-muted-foreground line-clamp-2 italic text-sm mb-4">
                                    {(assignment.description || "No description provided for this assignment.")
                                        .replace(/<[^>]*>/g, '')
                                        .replace(/&nbsp;/g, ' ')
                                        .replace(/&amp;/g, '&')
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>')
                                        .replace(/&quot;/g, '"')
                                        .replace(/&#39;/g, "'")}
                                </p>

                                {submission?.status === "graded" && submission.isReleased && (
                                    <div className="mt-4 p-4 rounded-xl bg-green-50/50 border border-green-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <div>
                                                <p className="text-sm font-bold text-green-900">Final Grade</p>
                                                <p className="text-xs text-green-700">Released by instructor</p>
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
                                    onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                                >
                                    {submission ? (submission.status === "graded" && submission.isReleased ? "View Feedback" : "View Submission") : "Start Assignment"}
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}

                {assignments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl">
                        <PenTool className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground">No assignments have been posted yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

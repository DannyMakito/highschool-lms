
import { useNavigate, useParams } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ChevronLeft,
    Clock,
    FileText,
    AlertCircle,
    GraduationCap,
    Info,
    Calendar,
    ArrowRight
} from "lucide-react";

export default function StudentQuizDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { quizzes, subjects, submissions } = useSubjects();
    const { user } = useAuth();

    const quiz = quizzes.find(q => q.id === id);
    const subject = subjects.find(s => s.id === quiz?.subjectId);

    // In a real app we'd filter submissions by user ID too
    const userSubmissions = submissions.filter(s => s.quizId === id);
    const attemptsTaken = userSubmissions.length;
    const attemptsRemaining = quiz ? ((quiz.settings?.allowedAttempts || 0) - attemptsTaken) : 0;
    const isOutOfAttempts = attemptsRemaining <= 0 && quiz?.settings?.allowedAttempts !== 0;

    if (!quiz) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Quiz not found</h2>
                <p className="text-slate-500 mb-6">The quiz you are looking for might have been closed or removed.</p>
                <Button onClick={() => navigate("/student/quizzes")} className="rounded-xl">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="w-full px-4 py-5 md:px-8 lg:px-12 space-y-6 md:space-y-8">
            <header className="space-y-6">
                <Button
                    variant="ghost"
                    className="p-0 h-auto hover:bg-transparent text-slate-500 font-bold flex items-center gap-2"
                    onClick={() => navigate("/student/quizzes")}
                >
                    <ChevronLeft className="h-5 w-5" /> Back to Quizzes
                </Button>

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold">
                            {subject?.name || "General"}
                        </Badge>
                        <span className="text-slate-300">-</span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                            <Calendar className="h-4 w-4" /> Ended {quiz.settings?.availability?.endDate ? new Date(quiz.settings.availability.endDate).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                        {quiz.title}
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl">
                        {quiz.description || "Once you've completed the learning material, please complete the assessment by clicking \"Start Assessment\""}
                    </p>
                </div>
            </header>

            <Card className="border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                <CardContent className="p-5 sm:p-6 md:p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-16">
                        <div className="space-y-8">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-slate-500">Duration:</span>
                                </div>
                                <span className="font-black text-slate-900 text-lg">{quiz.settings?.timeLimit || 0} minutes</span>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                        <GraduationCap className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-slate-500">Pass Mark:</span>
                                </div>
                                <span className="font-black text-slate-900 text-lg">{quiz.settings?.passingGrade || 0}%</span>
                            </div>
                        </div>

                        <div className="space-y-8 md:border-l md:border-slate-50 md:pl-16">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-bold text-slate-500">Attempts Taken:</span>
                                <span className="font-black text-slate-900 text-lg">{attemptsTaken}</span>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-bold text-slate-500">Attempts Remaining:</span>
                                <span className="font-black text-slate-900 text-lg">
                                    {(quiz.settings?.allowedAttempts === 0 || !quiz.settings) ? "Unlimited" : attemptsRemaining}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <span className="font-bold text-slate-500">Status:</span>
                                <Badge className={attemptsTaken > 0 ? "bg-emerald-50 text-emerald-600 border-none font-bold" : "bg-slate-100 text-slate-400 border-none font-bold"}>
                                    {attemptsTaken > 0 ? "Done" : "Not Attempted"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Info className="h-5 w-5 text-indigo-500" /> Study Resources
                </h2>
                <Card className="border-slate-100 rounded-2xl bg-slate-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                                <FileText className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-700 underline underline-offset-4 decoration-slate-200 group-hover:decoration-indigo-500 transition-all">
                                {quiz.title} - Resource Manual.pdf
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                <Button
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl border-slate-200 h-14 px-8 font-black text-slate-600 hover:bg-slate-50"
                    onClick={() => navigate("/student/quizzes")}
                >
                    Back to Quizzes
                </Button>
                <Button
                    className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-8 font-black shadow-lg shadow-indigo-100 transition-all gap-2"
                    disabled={isOutOfAttempts}
                    onClick={() => navigate(`/student/quizzes/${quiz.id}/take`)}
                >
                    {attemptsTaken > 0 ? "Retake Assessment" : "Start Assessment"} <ArrowRight className="h-5 w-5" />
                </Button>
            </div>

            {isOutOfAttempts && (
                <p className="text-center text-sm font-bold text-rose-500 bg-rose-50 p-4 rounded-xl flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" /> You have reached the maximum number of attempts for this quiz.
                </p>
            )}
        </div>
    );
}


import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    X,
    LayoutGrid,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { toast } from "sonner";

export default function TakeQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { quizzes, addSubmission } = useSubjects();

    const quiz = useMemo(() => quizzes.find(q => q.id === id), [quizzes, id]);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
    const [timeLeft, setTimeLeft] = useState(quiz ? quiz.settings.timeLimit * 60 : 0);
    const [isFinished, setIsFinished] = useState(false);
    const [startTime] = useState(Date.now());
    const [quizResult, setQuizResult] = useState<{
        score: number;
        totalPoints: number;
        accuracy: number;
        correctCount: number;
        timeSpent: number;
    } | null>(null);

    // Timer logic
    useEffect(() => {
        if (!quiz || isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [quiz, isFinished]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQuestion = quiz?.questions[currentQuestionIndex];
    const totalQuestions = quiz?.questions.length || 0;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    const handleAnswerSelect = (optionId: string) => {
        if (!currentQuestion) return;

        setSelectedAnswers(prev => {
            const currentAnswers = prev[currentQuestion.id] || [];
            if (currentQuestion.allowMultipleAnswers) {
                if (currentAnswers.includes(optionId)) {
                    return { ...prev, [currentQuestion.id]: currentAnswers.filter(id => id !== optionId) };
                } else {
                    return { ...prev, [currentQuestion.id]: [...currentAnswers, optionId] };
                }
            } else {
                return { ...prev, [currentQuestion.id]: [optionId] };
            }
        });
    };

    const handleSubmit = () => {
        if (!quiz) return;

        setIsFinished(true);

        // Calculate score
        let score = 0;
        let correctCount = 0;

        quiz.questions.forEach(q => {
            const userAnswers = selectedAnswers[q.id] || [];
            const correctOptionIds = q.options.filter(opt => opt.isCorrect).map(opt => opt.id);

            const isCorrect = userAnswers.length === correctOptionIds.length &&
                userAnswers.every(id => correctOptionIds.includes(id));

            if (isCorrect) {
                score += q.points;
                correctCount++;
            }
        });

        const accuracy = Math.round((correctCount / totalQuestions) * 100);
        const timeSpent = Math.round((Date.now() - startTime) / 1000);

        const submission = {
            id: crypto.randomUUID(),
            quizId: quiz.id,
            learnerId: "current-user-id", // In real app
            learnerName: "Current User",
            score,
            totalPoints: quiz.questions.reduce((acc, q) => acc + q.points, 0),
            accuracy,
            timeSpent,
            submittedAt: new Date().toISOString(),
            status: "completed" as const,
            responses: selectedAnswers
        };

        addSubmission(submission);
        setQuizResult({
            score,
            totalPoints: submission.totalPoints,
            accuracy,
            correctCount,
            timeSpent
        });
        toast.success("Quiz submitted successfully!");
    };

    if (!quiz || (!currentQuestion && !isFinished)) return null;

    if (isFinished && quizResult) {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto font-sans items-center py-12 px-6">
                <div className="w-full px-4 md:px-8 lg:px-12 space-y-8 text-center">
                    <div className="space-y-4">
                        <div className="h-24 w-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900">Quiz Completed!</h1>
                        <p className="text-slate-500 font-medium">Here's how you performed in {quiz.title}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="rounded-2xl border-slate-100 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Score</p>
                                <p className="text-2xl font-black text-slate-900">{quizResult.score}/{quizResult.totalPoints}</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-slate-100 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Accuracy</p>
                                <p className="text-2xl font-black text-emerald-500">{quizResult.accuracy}%</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-slate-100 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Correct</p>
                                <p className="text-2xl font-black text-slate-900">{quizResult.correctCount}/{totalQuestions}</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-slate-100 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time</p>
                                <p className="text-2xl font-black text-slate-900">{Math.floor(quizResult.timeSpent / 60)}m {quizResult.timeSpent % 60}s</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="outline"
                            className="h-14 px-10 rounded-2xl font-black text-slate-600 border-slate-200"
                            onClick={() => navigate(`/student/quizzes/${quiz.id}`)}
                        >
                            Back to Details
                        </Button>
                        <Button
                            className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100"
                            onClick={() => navigate("/student/quizzes")}
                        >
                            All Quizzes
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden font-sans">
            {/* Top Bar - Mobile First */}
            <header className="h-20 border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-11 w-11 bg-slate-50 text-slate-400"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to exit? Your progress will be lost.")) {
                                navigate(`/student/quizzes/${quiz.id}`);
                            }
                        }}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Quiz in Progress</p>
                        <h2 className="text-sm font-black text-slate-900 line-clamp-1 max-w-[200px]">{quiz.title}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                        <Clock className={cn("h-4 w-4", timeLeft < 60 ? "text-rose-500 animate-pulse" : "text-amber-500")} />
                        <span className={cn("text-sm font-black tracking-tighter tabular-nums", timeLeft < 60 ? "text-rose-500" : "text-slate-700")}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <Button
                        className="bg-slate-900 border-none hover:bg-slate-800 text-white rounded-xl px-6 h-11 font-black transition-all"
                        onClick={handleSubmit}
                    >
                        Submit
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16">
                    <div className="w-full px-4 md:px-10 space-y-12">
                        {/* Mobile Progress Bar (Image 3 Ref) */}
                        <div className="md:hidden flex flex-col items-center gap-6 mb-12">
                            <div className="h-32 w-32 relative">
                                <CircularProgressbar
                                    value={progress}
                                    strokeWidth={8}
                                    styles={buildStyles({
                                        pathColor: `#10B981`,
                                        trailColor: '#F0F9FF',
                                        strokeLinecap: 'round'
                                    })}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-slate-900">{currentQuestionIndex + 1}/{totalQuestions}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</span>
                                </div>
                            </div>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-500">
                                Question {currentQuestionIndex + 1} of {totalQuestions}
                            </h3>
                            <p className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
                                {currentQuestion.text}
                            </p>
                        </div>

                        {/* Options (Image 1 & 3 Ref) */}
                        <div className="space-y-4">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = selectedAnswers[currentQuestion.id]?.includes(option.id);
                                const letter = String.fromCharCode(65 + idx);

                                return (
                                    <button
                                        key={option.id}
                                        className={cn(
                                            "w-full p-6 md:p-8 rounded-[1.5rem] border-2 text-left flex items-center gap-6 transition-all group relative overflow-hidden",
                                            isSelected
                                                ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-50"
                                                : "border-slate-100 hover:border-slate-200 bg-white"
                                        )}
                                        onClick={() => handleAnswerSelect(option.id)}
                                    >
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 transition-colors",
                                            isSelected ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                                        )}>
                                            {letter}
                                        </div>
                                        <span className={cn(
                                            "text-lg md:text-xl font-bold flex-1 leading-tight",
                                            isSelected ? "text-slate-900" : "text-slate-600"
                                        )}>
                                            {option.text}
                                        </span>
                                        {isSelected && (
                                            <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                                                <CheckCircle2 className="h-4 w-4 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </main>

                {/* Right Sidebar - Deskrop (Image 1 Ref) */}
                <aside className="hidden lg:flex w-96 border-l border-slate-100 flex-col bg-slate-50/50">
                    <div className="p-8 space-y-8 overflow-y-auto">
                        {/* Circular Timer (Image 1 Ref) */}
                        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
                            <CardContent className="p-8 text-center space-y-4 bg-white">
                                <div className="h-28 w-28 mx-auto relative">
                                    <CircularProgressbar
                                        value={(timeLeft / (quiz.settings.timeLimit * 60)) * 100}
                                        strokeWidth={10}
                                        styles={buildStyles({
                                            pathColor: timeLeft < 60 ? `#F43F5E` : `#10B981`,
                                            trailColor: '#F8FAFC',
                                            strokeLinecap: 'round'
                                        })}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-black tabular-nums">{formatTime(timeLeft)}</span>
                                    </div>
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Timer Remaining</p>
                            </CardContent>
                        </Card>

                        {/* Navigation List (Image 1 Ref) */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between text-slate-900">
                                <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4" /> Quiz Questions List
                                </h4>
                                <ChevronDown className="h-4 w-4" />
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {quiz.questions.map((q, idx) => {
                                    const isAnswered = (selectedAnswers[q.id]?.length || 0) > 0;
                                    const isCurrent = currentQuestionIndex === idx;

                                    return (
                                        <button
                                            key={q.id}
                                            className={cn(
                                                "w-full p-4 rounded-xl border flex items-center justify-between transition-all text-left",
                                                isCurrent
                                                    ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-50"
                                                    : isAnswered
                                                        ? "bg-emerald-50/50 border-emerald-100"
                                                        : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                            onClick={() => setCurrentQuestionIndex(idx)}
                                        >
                                            <span className={cn(
                                                "text-xs font-bold",
                                                isCurrent ? "text-indigo-600" : isAnswered ? "text-emerald-700" : "text-slate-500"
                                            )}>
                                                Quiz question {idx + 1}
                                            </span>
                                            {isAnswered && (
                                                <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Bottom Navigation - Mobile (Image 3 Ref) */}
            <footer className="h-24 border-t border-slate-100 bg-white px-6 flex items-center justify-between sticky bottom-0 z-10">
                <Button
                    variant="outline"
                    className="h-14 px-8 rounded-2xl border-slate-100 font-black text-slate-600 gap-2 disabled:opacity-30 transition-all flex-1 md:flex-none uppercase tracking-widest text-xs"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                >
                    <ChevronLeft className="h-5 w-5" /> Prev
                </Button>

                {/* Question dots for medium screens */}
                <div className="hidden md:flex items-center gap-2 px-8 overflow-hidden max-w-sm">
                    {quiz.questions.map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                currentQuestionIndex === idx ? "w-8 bg-indigo-500" : "w-2 bg-slate-100"
                            )}
                        />
                    ))}
                </div>

                <Button
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black gap-2 transition-all flex-1 md:flex-none ml-4 md:ml-0 uppercase tracking-widest text-xs"
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                >
                    Next <ChevronRight className="h-5 w-5" />
                </Button>
            </footer>
        </div>
    );
}


import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
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
    const { user } = useAuth();
    const { quizzes, addSubmission, loading } = useSubjects();

    const quiz = useMemo(() => quizzes.find(q => q.id === id), [quizzes, id]);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [showSecurityShield, setShowSecurityShield] = useState(false);
    const [startTime] = useState(Date.now());
    const [quizResult, setQuizResult] = useState<{
        score: number;
        totalPoints: number;
        accuracy: number;
        correctCount: number;
        timeSpent: number;
    } | null>(null);

    // Memoize and shuffle questions if needed
    const questions = useMemo(() => {
        if (!quiz?.questions) return [];
        let items = [...quiz.questions];
        if (quiz.settings?.shuffleQuestions) {
            // Fisher-Yates Shuffle
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
        }
        return items;
    }, [quiz?.id]); // Only reshuffle if the quiz ID changes

    // Security & Anti-screenshot logic
    useEffect(() => {
        if (!quiz?.settings?.proctoring) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!quiz.settings.proctoring.preventScreenshots) return;
            // Block common screenshot/print keys
            const blockedKeys = ['PrintScreen', 'F12', 'p', 's'];
            if (blockedKeys.includes(e.key) || (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'shift' && e.key === 'i'))) {
                if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
                    e.preventDefault();
                    toast.error("Action Blocked", { description: "Screenshots and Printing are disabled for this assessment." });
                }
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            if (!quiz.settings.proctoring.preventScreenshots) return;
            e.preventDefault();
            toast.error("Disabled", { description: "Right-click is disabled during the assessment." });
        };

        const handleVisibilityChange = () => {
            if (quiz.settings.proctoring.tabSwitchDetection && document.visibilityState === 'hidden') {
                setShowSecurityShield(true);
                toast.warning("Tab Switch Detected", { 
                    description: "Switching tabs is recorded and may invalidate your assessment.",
                    duration: 5000
                });
            }
        };

        const handleBlur = () => {
            if (quiz.settings.proctoring.tabSwitchDetection) {
                setShowSecurityShield(true);
            }
        };

        const handleFocus = () => {
            setShowSecurityShield(false);
        };

        // Inject global security CSS
        let style: HTMLStyleElement | null = null;
        if (quiz.settings.proctoring.preventScreenshots) {
            style = document.createElement('style');
            style.innerHTML = `
                @media print { body { display: none !important; } }
                .no-select { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
            `;
            document.head.appendChild(style);
        }

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            if (style) document.head.removeChild(style);
        };
    }, [quiz?.settings?.proctoring]);

    // Set initial time when quiz data loads
    useEffect(() => {
        if (quiz && !isFinished && timeLeft === 0) {
            setTimeLeft(quiz.settings?.timeLimit ? quiz.settings.timeLimit * 60 : 3600);
        }
    }, [quiz, isFinished]);

    // Timer logic
    useEffect(() => {
        if (!quiz || isFinished || timeLeft <= 0) return;

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
    }, [quiz, isFinished, timeLeft > 0]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQuestion = (questions || [])[currentQuestionIndex];
    const totalQuestions = (questions || []).length;
    const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

    const handleAnswerSelect = (optionId: string | string[]) => {
        if (!currentQuestion) return;

        setSelectedAnswers(prev => {
            const currentAnswers = prev[currentQuestion.id] || [];

            if (currentQuestion.type === 'fill-in-the-blank') {
                return { ...prev, [currentQuestion.id]: Array.isArray(optionId) ? optionId : [optionId] };
            }

            if (currentQuestion.allowMultipleAnswers) {
                const singleId = Array.isArray(optionId) ? optionId[0] : optionId;
                if (currentAnswers.includes(singleId)) {
                    return { ...prev, [currentQuestion.id]: currentAnswers.filter(id => id !== singleId) };
                } else {
                    return { ...prev, [currentQuestion.id]: [...currentAnswers, singleId] };
                }
            } else {
                return { ...prev, [currentQuestion.id]: Array.isArray(optionId) ? optionId : [optionId] };
            }
        });
    };

    const handleSubmit = () => {
        if (!quiz) return;

        setIsFinished(true);

        // Calculate score
        let score = 0;
        let correctCount = 0;

        (questions || []).forEach(q => {
            const userAnswers = selectedAnswers[q.id] || [];
            let isCorrect = false;

            if (q.type === 'fill-in-the-blank') {
                const userAnswer = userAnswers[0] || "";
                isCorrect = userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
            } else {
                const correctOptionIds = (q.options || []).filter(opt => opt.isCorrect).map(opt => opt.id);
                isCorrect = userAnswers.length === correctOptionIds.length &&
                    userAnswers.every(id => correctOptionIds.includes(id));
            }

            if (isCorrect) {
                score += q.points;
                correctCount++;
            }
        });

        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const timeSpent = Math.round((Date.now() - startTime) / 1000);

        const totalPoints = (quiz.questions || []).reduce((acc, q) => acc + q.points, 0);

        const submission = {
            id: crypto.randomUUID(),
            quizId: quiz.id,
            studentId: user?.id || "anonymous",
            studentName: user?.name || "Student",
            score,
            totalPoints,
            accuracy,
            timeSpent,
            completedAt: new Date().toISOString(),
            status: "completed" as const,
            answers: (questions || []).map(q => {
                const userAnswers = selectedAnswers[q.id] || [];
                let isCorrect = false;

                if (q.type === 'fill-in-the-blank') {
                    const userAnswer = userAnswers[0] || "";
                    isCorrect = userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
                } else {
                    const correctIds = (q.options || []).filter(opt => opt.isCorrect).map(opt => opt.id);
                    isCorrect = userAnswers.length === correctIds.length &&
                        userAnswers.every(id => correctIds.includes(id));
                }

                return {
                    questionId: q.id,
                    answer: userAnswers,
                    isCorrect,
                    pointsEarned: isCorrect ? q.points : 0,
                    timeSpent: 0
                };
            })
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

    if (loading) {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center">
                <div className="h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-bold">Preparing your assessment...</p>
            </div>
        );
    }

    if (!quiz || (!currentQuestion && !isFinished)) {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 text-center">
                <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="h-10 w-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Oops! Assessment incomplete</h2>
                <p className="text-slate-500 max-w-md mb-8">This assessment hasn't been set up with any questions yet. Please contact your instructor.</p>
                <Button onClick={() => navigate(-1)} className="rounded-xl px-10 h-14 font-bold bg-slate-900 text-white">Go Back</Button>
            </div>
        );
    }

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
        <div className={cn(
            "fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden font-sans",
            quiz?.settings?.proctoring?.preventScreenshots && "no-select"
        )}>
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
                                {currentQuestion?.text}
                            </p>
                        </div>

                        {/* Options Section */}
                        <div className="space-y-4">
                            {currentQuestion?.type === 'fill-in-the-blank' ? (
                                <div className="space-y-6">
                                    <div className="p-6 md:p-8 rounded-[1.5rem] bg-slate-50 border-2 border-slate-100 flex flex-col gap-4 group transition-all focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-8 focus-within:ring-indigo-50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                <X className="h-4 w-4 transform rotate-45" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Answer Below</p>
                                        </div>
                                        <textarea
                                            value={selectedAnswers[currentQuestion.id]?.[0] || ""}
                                            onChange={(e) => handleAnswerSelect([e.target.value])}
                                            placeholder="Type your answer here..."
                                            className="w-full bg-transparent border-none text-xl md:text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0 min-h-[80px] resize-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-6 py-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <p className="text-[11px] font-bold">Spelling matters! Ensure your answer is typed correctly before proceeding.</p>
                                    </div>
                                </div>
                            ) : (
                                currentQuestion?.options.map((option, idx) => {
                                    const isSelected = currentQuestion && selectedAnswers[currentQuestion.id]?.includes(option.id);
                                    const letter = String.fromCharCode(65 + idx);

                                    return (
                                        <button
                                            key={option.id}
                                            className={cn(
                                                "w-full p-6 md:p-8 rounded-[1.5rem] border-2 text-left flex items-center gap-6 transition-all group relative overflow-hidden",
                                                isSelected
                                                    ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-50"
                                                    : "border-slate-100 hover:border-slate-200 bg-white shadow-sm"
                                            )}
                                            onClick={() => handleAnswerSelect(option.id)}
                                        >
                                            <div className={cn(
                                                "h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 transition-colors",
                                                isSelected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
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
                                })
                            )}
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
                                {(questions || []).map((q, idx) => {
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
                    {(questions || []).map((_, idx) => (
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

            {/* Security Shield Overlay */}
            {showSecurityShield && quiz?.settings?.proctoring?.tabSwitchDetection && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                    <div className="h-24 w-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
                        <AlertCircle className="h-12 w-12 text-rose-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">Security Alert</h2>
                    <p className="text-slate-400 max-w-md text-lg font-medium">
                        Focus lost. Please return to the assessment window immediately. Switching tabs or applications is strictly prohibited.
                    </p>
                    <div className="mt-12 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3 text-slate-300 text-sm italic">
                        <Info className="h-4 w-4" />
                        This event has been recorded for instructor review.
                    </div>
                </div>
            )}
        </div>
    );
}

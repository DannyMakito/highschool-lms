
import { useState } from "react";
import {
    ChevronLeft,
    Share2,
    MoreHorizontal,
    Download,
    ArrowRight,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    ChevronDown,
    Eye,
    History,
    AlertCircle,
    HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useNavigate, useParams } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";




export default function QuizAnalytics() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { quizzes, subjects, submissions } = useSubjects();
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const quiz = quizzes.find(q => q.id === id);
    const subject = subjects.find(s => s.id === quiz?.subjectId);
    const quizSubmissions = submissions.filter(s => s.quizId === id);

    // Calculate Metrics
    const totalSubmissions = quizSubmissions.length;
    const avgAccuracy = totalSubmissions > 0
        ? Math.round(quizSubmissions.reduce((acc, curr) => acc + curr.accuracy, 0) / totalSubmissions)
        : 0;

    const completionRate = totalSubmissions > 0
        ? Math.round((quizSubmissions.filter(s => s.status === "completed").length / totalSubmissions) * 100)
        : 0;

    const totalSeconds = quizSubmissions.reduce((acc, curr) => acc + curr.timeSpent, 0);
    const avgTimeSeconds = totalSubmissions > 0 ? Math.round(totalSeconds / totalSubmissions) : 0;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate Question aggregated data
    const questionStats = quiz.questions.map(q => {
        const responsesCount = quizSubmissions.length;
        const correctCount = quizSubmissions.filter(s => {
            const userAnswers = s.responses[q.id] || [];
            const correctOptionIds = q.options.filter(opt => opt.isCorrect).map(opt => opt.id);
            return userAnswers.length === correctOptionIds.length &&
                userAnswers.every(id => correctOptionIds.includes(id));
        }).length;

        return {
            ...q,
            accuracy: responsesCount > 0 ? Math.round((correctCount / responsesCount) * 100) : 0,
            correctCount,
            totalCount: responsesCount
        };
    });

    if (!quiz) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50">
                <div className="text-center space-y-4">
                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                        <HelpCircle className="h-8 w-8 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Quiz not found</h2>
                    <p className="text-slate-500">The quiz you're looking for doesn't exist or has been deleted.</p>
                    <Button onClick={() => navigate("/teacher/assignments/quizzes")} className="rounded-xl">
                        Back to Quizzes
                    </Button>
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col h-full bg-slate-50/30 overflow-y-auto">
            {/* Nav Header */}
            <header className="p-8 pb-0 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            className="p-0 h-9 w-9 rounded-xl hover:bg-slate-50"
                            onClick={() => navigate("/teacher/subjects")} // Fixed to go back to subjects or quizzes
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <nav className="flex items-center gap-2 text-sm font-bold text-slate-400">
                            <span>Quiz</span>
                            <span>/</span>
                            <span className="text-slate-900">{quiz.title}</span>
                        </nav>

                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="rounded-xl border-slate-100 font-bold h-10 gap-2">
                            <Share2 className="h-4 w-4" /> Share
                        </Button>
                        <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-100">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {quizSubmissions.some(s => s.status === "need-review") && (
                    <div className="bg-[#FFF9E5] border border-amber-100/50 rounded-2xl p-4 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <span className="text-sm font-bold text-slate-800">
                                {quizSubmissions.filter(s => s.status === "need-review").length} Submission(s) need review for thorough scoring!
                            </span>
                            <Button variant="link" className="p-0 text-indigo-600 font-black text-sm h-auto">View Submissions</Button>
                        </div>
                    </div>
                )}

                <div className="flex items-start justify-between mb-8">
                    <div className="space-y-6 flex-1">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-slate-100 text-slate-500 border-none font-bold uppercase tracking-wider text-[10px]">
                                {quiz.status === "published" ? "Live" : "Draft"}
                            </Badge>
                            <Badge className={cn(
                                "border-none font-bold",
                                quiz.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                            )}>
                                ● {quiz.status === "published" ? "Active" : "Draft"}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
                                {quiz.title}
                            </h1>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><History className="h-4 w-4" /></Button>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-none font-bold py-1.5 px-3">
                                    {subject?.name || "General"}
                                </Badge>
                                <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-none font-bold py-1.5 px-3">
                                    Grade {subject?.gradeTier || "--"}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                <span className="flex items-center gap-1.5"><HelpCircle className="h-4 w-4" /> {quiz.questions.length} Questions</span>
                                <span>•</span>
                                <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                    </div>

                    {/* Stats Rings */}
                    <div className="flex items-center gap-12 bg-white pr-4">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14">
                                <CircularProgressbar
                                    value={avgAccuracy}
                                    strokeWidth={12}
                                    styles={buildStyles({ pathColor: `#FBBF24`, trailColor: '#FEE2E2', })}
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Accuracy</p>
                                <p className="text-2xl font-black text-slate-900">{avgAccuracy}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14">
                                <CircularProgressbar
                                    value={completionRate}
                                    strokeWidth={12}
                                    styles={buildStyles({ pathColor: `#10B981`, trailColor: '#D1FAE5', })}
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Completed</p>
                                <p className="text-2xl font-black text-slate-900">{completionRate}%</p>
                            </div>
                        </div>
                        <div className="border-l border-slate-100 pl-8 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Submissions</p>
                                <p className="text-2xl font-black text-slate-900">{totalSubmissions}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Avg. Time</p>
                                <p className="text-2xl font-black text-slate-900">{formatTime(avgTimeSeconds)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="bg-transparent h-auto p-0 gap-8 border-b border-slate-100 w-full justify-start rounded-none">
                        <TabsTrigger
                            value="questions"
                            className="px-0 py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none font-bold text-slate-400 transition-all"
                        >
                            Questions
                        </TabsTrigger>
                        <TabsTrigger
                            value="overview"
                            className="px-0 py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none font-bold text-slate-400 transition-all"
                        >
                            Overview
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="questions" className="p-8 px-0 space-y-6">
                        {totalSubmissions === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 text-center space-y-4 shadow-sm">
                                <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                                    <Clock className="h-10 w-10 text-indigo-500" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900">Waiting for submissions</h2>
                                <p className="text-slate-500 max-w-md mx-auto font-medium">
                                    Once students start taking this quiz, you'll see a detailed breakdown of their responses and accuracy here.
                                </p>
                                <Button variant="outline" className="rounded-xl border-slate-200 font-bold h-11 px-8 gap-2">
                                    <Share2 className="h-4 w-4" /> Share Quiz Link
                                </Button>
                            </div>
                        ) : (
                            questionStats.map((stat, idx) => (
                                <div key={stat.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm group hover:border-indigo-100 transition-all">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-400">
                                                    Question {idx + 1}
                                                </Badge>
                                                <Badge className={cn(
                                                    "border-none font-bold",
                                                    stat.accuracy >= 70 ? "bg-emerald-50 text-emerald-600" :
                                                        stat.accuracy >= 40 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {stat.accuracy}% Accuracy
                                                </Badge>
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 leading-tight pr-12">
                                                {stat.text}
                                            </h3>
                                        </div>
                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            {stat.points}pt
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-2xl bg-slate-50/50">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Correct</p>
                                            <p className="text-xl font-black text-slate-900">{stat.correctCount}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50/50">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Incorrect</p>
                                            <p className="text-xl font-black text-slate-900">{stat.totalCount - stat.correctCount}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>


                    <TabsContent value="overview" className="p-0">
                        {totalSubmissions === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-b-[2rem] p-20 text-center space-y-4 shadow-sm">
                                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                    <User className="h-10 w-10 text-slate-300" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">No student activity yet</h2>
                                <p className="text-slate-500">Student scores and participation matrix will appear here.</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-100 rounded-b-[2rem] overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/30 border-b border-slate-100">
                                            <th className="p-4 pl-8 w-12 text-[11px] font-black text-slate-400 uppercase tracking-widest">No.</th>
                                            <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Learner</th>
                                            <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Accuracy</th>
                                            <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                                            <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                                            <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                                            <th className="p-4 pr-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {quizSubmissions.map((s, i) => (
                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-4 pl-8 text-xs font-bold text-slate-400">{i + 1}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 ring-1 ring-slate-100">
                                                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.learnerId}`} />
                                                            <AvatarFallback>{s.learnerName[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-bold text-slate-800">{s.learnerName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge className={cn(
                                                        "border-none font-bold",
                                                        s.accuracy >= 80 ? "bg-emerald-50 text-emerald-600" :
                                                            s.accuracy >= 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                                    )}>
                                                        {s.accuracy}%
                                                    </Badge>
                                                </td>
                                                <td className="p-4 font-black text-slate-700">{s.score}/{s.totalPoints}</td>
                                                <td className="p-4 font-bold text-slate-500 tabular-nums">{formatTime(s.timeSpent)}</td>
                                                <td className="p-4 text-xs font-bold text-slate-400">{new Date(s.submittedAt).toLocaleDateString()}</td>
                                                <td className="p-4 pr-8 text-right text-indigo-600">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="font-black rounded-lg hover:bg-indigo-50"
                                                        onClick={() => setSelectedStudent(s)}
                                                    >
                                                        Review <ArrowRight className="h-4 w-4 ml-2" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                </Tabs>
            </header>

            {/* Student Review Modal */}
            <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
                    <div className="bg-white p-10 space-y-10">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-14 w-14 ring-4 ring-indigo-50">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudent?.learnerId}`} />
                                    <AvatarFallback>{selectedStudent?.learnerName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{selectedStudent?.learnerName}</h2>
                                    <p className="text-sm font-bold text-slate-400">Student Submission Profile</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Accuracy</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4">
                                            <CircularProgressbar value={selectedStudent?.accuracy || 0} strokeWidth={15} styles={buildStyles({ pathColor: '#10B981' })} />
                                        </div>
                                        <span className="text-lg font-black text-slate-900">{selectedStudent?.accuracy || 0}%</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Score</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                                        <span className="text-lg font-black text-slate-900">{selectedStudent?.score || 0}/{selectedStudent?.totalPoints || 0}</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time Spent</p>
                                    <span className="text-lg font-black text-slate-900">{formatTime(selectedStudent?.timeSpent || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">{quiz.title}</h3>
                            <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
                                <span>Submitted {selectedStudent ? new Date(selectedStudent.submittedAt).toLocaleDateString() : '--'}</span>
                                <span>•</span>
                                <span>{selectedStudent ? new Date(selectedStudent.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5"><HelpCircle className="h-4 w-4" /> {quiz.questions.length} Questions</span>
                            </div>
                        </div>

                        {/* Question Grid */}
                        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                            {quiz.questions.map((q, i) => {
                                const userAnswers = selectedStudent?.responses[q.id] || [];
                                const correctOptionIds = q.options.filter(opt => opt.isCorrect).map(opt => opt.id);
                                const isCorrect = userAnswers.length === correctOptionIds.length &&
                                    userAnswers.every(id => correctOptionIds.includes(id));

                                return (
                                    <div key={q.id} className="relative">
                                        <div className={cn(
                                            "h-14 rounded-2xl flex flex-col items-center justify-center font-black text-slate-600 border-2 transition-all",
                                            isCorrect ? "bg-emerald-50 border-emerald-500/20" : "bg-red-50 border-red-500/20"
                                        )}>
                                            <span className="text-xs">{i + 1}</span>
                                        </div>
                                        <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-white shadow-sm flex items-center justify-center">
                                            {isCorrect ? <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-white" /> : <XCircle className="h-3 w-3 text-red-500 fill-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary Legend */}
                        <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                            <div className="flex gap-8">
                                <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Correct
                                    <span className="text-slate-400">
                                        {quiz.questions.filter(q => {
                                            const userAnswers = selectedStudent?.responses[q.id] || [];
                                            const correctIds = q.options.filter(opt => opt.isCorrect).map(opt => opt.id);
                                            return userAnswers.length === correctIds.length && userAnswers.every(id => correctIds.includes(id));
                                        }).length}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Incorrect
                                    <span className="text-slate-400">
                                        {quiz.questions.length - quiz.questions.filter(q => {
                                            const userAnswers = selectedStudent?.responses[q.id] || [];
                                            const correctIds = q.options.filter(opt => opt.isCorrect).map(opt => opt.id);
                                            return userAnswers.length === correctIds.length && userAnswers.every(id => correctIds.includes(id));
                                        }).length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Question Breakdown */}
                        <div className="space-y-6">
                            {quiz.questions.map((q, idx) => {
                                const userAnswers = selectedStudent?.responses[q.id] || [];
                                const correctOptionIds = q.options.filter(opt => opt.isCorrect).map(opt => opt.id);
                                const isCorrect = userAnswers.length === correctOptionIds.length &&
                                    userAnswers.every(id => correctOptionIds.includes(id));

                                return (
                                    <div key={q.id} className="p-8 rounded-[2rem] border border-slate-100 space-y-6 hover:border-indigo-100 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <HelpCircle className="h-5 w-5 text-slate-400" />
                                                <span className="text-xs font-black text-slate-900">Question {idx + 1}</span>
                                                <Badge className={cn(
                                                    "border-none font-bold",
                                                    isCorrect ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                                )}>
                                                    {isCorrect ? "✓ Correct" : "✕ Incorrect"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                                <Badge variant="outline" className="border-slate-100 rounded-lg text-slate-600 px-3">
                                                    {q.allowMultipleAnswers ? "Multiple Selection" : "Single Choice"}
                                                </Badge>
                                                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {q.points} point{q.points !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-lg font-black text-slate-900">{q.text}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt) => {
                                                    const isSelected = userAnswers.includes(opt.id);
                                                    const isCorrectOpt = opt.isCorrect;

                                                    return (
                                                        <div
                                                            key={opt.id}
                                                            className={cn(
                                                                "p-4 rounded-xl border-2 flex items-center justify-between transition-all",
                                                                isSelected && isCorrectOpt ? "bg-emerald-50 border-emerald-500/20" :
                                                                    isSelected && !isCorrectOpt ? "bg-red-50 border-red-500/20" :
                                                                        !isSelected && isCorrectOpt ? "bg-slate-50 border-emerald-500/10 border-dashed" :
                                                                            "bg-white border-slate-50"
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                "text-sm font-bold",
                                                                isSelected ? "text-slate-900" : "text-slate-500"
                                                            )}>{opt.text}</span>
                                                            {isSelected && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                            {isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-500" />}
                                                            {!isSelected && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-emerald-300 opacity-50" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

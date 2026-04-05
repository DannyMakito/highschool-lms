
import * as React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    ChevronLeft,
    Plus,
    MoreHorizontal,
    Trash2,
    GripVertical,
    Settings,
    Eye,
    CheckCircle2,
    HelpCircle,
    Clock,
    Zap,
    Type,
    CheckSquare,
    Save,
    LayoutDashboard,
    Cloud,
    Keyboard,
    History,
    ImageIcon,
    Video,
    Mic
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { Quiz, Question, QuestionType, QuestionOption } from "@/types";
import { cn } from "@/lib/utils";


// Custom Switch component for now
const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (v: boolean) => void }) => (
    <div
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
            "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
            checked ? "bg-primary" : "bg-slate-200"
        )}
    >
        <div className={cn(
            "absolute top-1 transform transition-transform w-3 h-3 rounded-full bg-white",
            checked ? "translate-x-6" : "translate-x-1"
        )} />
    </div>
);

// Custom Textarea component
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className={cn(
            "flex min-h-[60px] w-full rounded-2xl border-none bg-slate-50/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all placeholder:text-slate-400 font-medium",
            props.className
        )}
    />
);

export default function CreateQuiz() {
    const { id: subjectId, quizId } = useParams();
    const navigate = useNavigate();
    const { subjects, quizzes, addQuiz } = useSubjects();

    const subject = subjects.find(s => s.id === subjectId);
    const existingQuiz = quizzes.find(q => q.id === quizId);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const defaultQuiz: Quiz = {
        id: crypto.randomUUID(),
        subjectId: subjectId || "",
        title: "Untitled Quiz",
        description: "",
        questions: [
            {
                id: crypto.randomUUID(),
                type: "multiple-choice",
                text: "",
                options: [
                    { id: crypto.randomUUID(), text: "", isCorrect: false },
                    { id: crypto.randomUUID(), text: "", isCorrect: false }
                ],
                points: 1,
                estimationTime: 2,
                isRequired: true,
                randomizeOrder: false,
                allowMultipleAnswers: false
            }
        ],
        status: "draft",
        settingsConfigured: false,
        createdAt: new Date().toISOString(),
        settings: {
            timeLimit: 30,
            allowedAttempts: 1,
            passingGrade: 60,
            shuffleQuestions: false,
            showAnswers: "after-deadline",
            availability: {
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            },
            proctoring: {
                preventScreenshots: true,
                tabSwitchDetection: false
            }
        }
    };

    const [quiz, setQuiz] = useState<Quiz>(() => {
        if (!existingQuiz) return defaultQuiz;
        // Merge with defaults to ensure missing properties (like settings) don't cause crashes
        return {
            ...defaultQuiz,
            ...existingQuiz,
            settings: existingQuiz.settings ? { ...defaultQuiz.settings, ...existingQuiz.settings } : defaultQuiz.settings,
            questions: existingQuiz.questions && existingQuiz.questions.length > 0 ? existingQuiz.questions : defaultQuiz.questions
        };
    });



    const [activeQuestionId, setActiveQuestionId] = useState<string>(quiz.questions[0].id);
    const activeQuestion = quiz.questions.find(q => q.id === activeQuestionId) || quiz.questions[0];

    // Handlers
    const addQuestion = () => {
        const newQuestion: Question = {
            id: crypto.randomUUID(),
            type: "multiple-choice",
            text: "",
            options: [
                { id: crypto.randomUUID(), text: "", isCorrect: false },
                { id: crypto.randomUUID(), text: "", isCorrect: false }
            ],
            points: 1,
            estimationTime: 2,
            isRequired: true,
            randomizeOrder: false,
            allowMultipleAnswers: false
        };
        setQuiz(prev => ({
            ...prev,
            questions: [...prev.questions, newQuestion]
        }));
        setActiveQuestionId(newQuestion.id);
    };

    const updateQuestion = (id: string, updates: Partial<Question>) => {
        setQuiz(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q)
        }));
    };

    const addOption = (questionId: string) => {
        const question = quiz.questions.find(q => q.id === questionId);
        if (!question) return;

        const newOption: QuestionOption = {
            id: crypto.randomUUID(),
            text: "",
            isCorrect: false
        };

        updateQuestion(questionId, {
            options: [...question.options, newOption]
        });
    };

    const updateOption = (questionId: string, optionId: string, text: string) => {
        const question = quiz.questions.find(q => q.id === questionId);
        if (!question) return;

        updateQuestion(questionId, {
            options: question.options.map(o => o.id === optionId ? { ...o, text } : o)
        });
    };

    const toggleCorrectOption = (questionId: string, optionId: string) => {
        const question = quiz.questions.find(q => q.id === questionId);
        if (!question) return;

        updateQuestion(questionId, {
            options: question.options.map(o => ({
                ...o,
                isCorrect: question.allowMultipleAnswers
                    ? (o.id === optionId ? !o.isCorrect : o.isCorrect)
                    : o.id === optionId
            }))
        });
    };

    const deleteOption = (questionId: string, optionId: string) => {
        const question = quiz.questions.find(q => q.id === questionId);
        if (!question || question.options.length <= 2) return;

        updateQuestion(questionId, {
            options: question.options.filter(o => o.id !== optionId)
        });
    };

    const saveDraft = async () => {
        try {
            await addQuiz({ ...quiz, status: "draft" });
            toast.success("Draft Saved", {
                description: "Your quiz draft has been updated."
            });
        } catch (error: any) {
            toast.error("Save Failed", {
                description: error.message || "Failed to save your draft."
            });
        }
    };

    const publishQuiz = async () => {
        if (!quiz.settingsConfigured) {
            toast.error("Settings Required", {
                description: "Please review and save your quiz settings before publishing.",
                action: {
                    label: "Open Settings",
                    onClick: () => setIsSettingsOpen(true)
                }
            });
            return;
        }

        try {
            await addQuiz({ ...quiz, status: "published" });
            toast.success("Quiz Published", {
                description: "Your quiz is now live for students."
            });
            navigate(`/teacher/subjects/${subjectId}`);
        } catch (error: any) {
            toast.error("Publish Failed", {
                description: error.message || "Could not publish your quiz."
            });
        }
    };


    if (!subject) return <div>Subject not found</div>;

    return (
        <TooltipProvider>
            <div className="flex h-screen overflow-hidden bg-[#F9FBFC]">
                {/* Left Sidebar - Question Navigator */}
                <aside className="w-[280px] border-r border-[#EEF2F6] bg-white flex flex-col shrink-0">
                    <div className="p-4 border-b border-[#EEF2F6]">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="text-slate-500 hover:text-slate-800 -ml-2 mb-4"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to course
                        </Button>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                Question ({quiz.questions.length})
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={addQuestion}
                                className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            {quiz.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setActiveQuestionId(q.id)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all group relative border border-transparent",
                                        activeQuestionId === q.id
                                            ? "bg-white shadow-sm ring-1 ring-slate-200 border-primary/20"
                                            : "hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <span className={cn(
                                            "text-xs font-black w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
                                            activeQuestionId === q.id ? "bg-primary/20 text-primary" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {idx + 1}
                                        </span>
                                        <div className="space-y-1 overflow-hidden">
                                            <p className={cn(
                                                "text-[13px] font-bold truncate",
                                                activeQuestionId === q.id ? "text-slate-900" : "text-slate-500"
                                            )}>
                                                {q.text || "Untitled question"}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {q.type === "multiple-choice" ? (
                                                    <CheckSquare className="h-3 w-3 text-slate-400" />
                                                ) : (
                                                    <Type className="h-3 w-3 text-slate-400" />
                                                )}
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                                    {q.type.replace("-", " ")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {quiz.questions.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newQuests = quiz.questions.filter(quest => quest.id !== q.id);
                                                setQuiz({ ...quiz, questions: newQuests });
                                                if (activeQuestionId === q.id) setActiveQuestionId(newQuests[0].id);
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main Area */}
                <main className="flex-1 flex flex-col min-h-0 bg-[#F9FBFC]">
                    {/* Header */}
                    <header className="h-[72px] bg-white border-b border-[#EEF2F6] flex items-center justify-between px-8 shrink-0">
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-slate-400">
                                <History className="h-4 w-4" />
                                <span className="text-[13px] font-medium">Edited Just now</span>
                            </div>
                            <div className="h-6 w-px bg-slate-100 hidden md:block" />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                                    <LayoutDashboard className="h-4 w-4" />
                                </span>
                                <input
                                    value={quiz.title}
                                    onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                                    className="text-lg font-bold bg-transparent border-none focus-visible:outline-none focus-visible:ring-0 truncate w-full"
                                    placeholder="Enter quiz title..."
                                />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Cloud className="h-4 w-4 text-slate-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>Saved to cloud</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2 mr-4">
                                <div className="h-8 w-8 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] font-black text-white">RF</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-800">
                                <Plus className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-9 w-9 transition-colors",
                                    quiz.settingsConfigured ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-slate-400 hover:text-slate-800"
                                )}
                                onClick={() => setIsSettingsOpen(true)}
                            >
                                <Settings className="h-5 w-5" />
                            </Button>

                            <Button
                                variant="outline"
                                className="h-10 px-5 rounded-xl border-[#EEF2F6] font-bold text-slate-600 hover:bg-slate-50 transition-all gap-2"
                                onClick={() => setIsPreviewOpen(true)}
                            >
                                <Eye className="h-4 w-4" />
                                Preview
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 px-5 rounded-xl border-[#EEF2F6] font-bold text-slate-600 hover:bg-slate-50 transition-all gap-2"
                                onClick={saveDraft}
                            >
                                <Save className="h-4 w-4" />
                                Save Draft
                            </Button>
                            <Button
                                className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all font-bold gap-2 text-white"
                                onClick={publishQuiz}
                            >
                                Publish
                            </Button>
                        </div>
                    </header>

                    {/* Question Editor Area */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <div className="max-w-[800px] mx-auto py-12 px-6 space-y-12 pb-40">
                            {/* Quiz Metadata (Optional view) */}
                            {/* ... */}

                            {/* Active Question Editor */}
                            <div className="space-y-8">
                                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2.5rem]">
                                    <CardContent className="p-10 space-y-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <GripVertical className="h-5 w-5" />
                                                </div>
                                                <Select
                                                    value={activeQuestion.type}
                                                    onValueChange={(v: QuestionType) => {
                                                        let updates: Partial<Question> = { type: v };
                                                        if (v === "true-or-false") {
                                                            updates.options = [
                                                                { id: crypto.randomUUID(), text: "True", isCorrect: true },
                                                                { id: crypto.randomUUID(), text: "False", isCorrect: false }
                                                            ];
                                                            updates.allowMultipleAnswers = false;
                                                        } else if (v === "multiple-choice") {
                                                            updates.options = [
                                                                { id: crypto.randomUUID(), text: "", isCorrect: false },
                                                                { id: crypto.randomUUID(), text: "", isCorrect: false }
                                                            ];
                                                        }
                                                        updateQuestion(activeQuestion.id, updates);
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[200px] h-10 rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-600">
                                                        <div className="flex items-center gap-2">
                                                            {activeQuestion.type === "multiple-choice" ? <CheckSquare className="h-4 w-4" /> :
                                                                activeQuestion.type === "true-or-false" ? <CheckCircle2 className="h-4 w-4" /> :
                                                                    <Type className="h-4 w-4" />}
                                                            <SelectValue />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                        <SelectItem value="multiple-choice" className="rounded-lg">Multiple Choice</SelectItem>
                                                        <SelectItem value="true-or-false" className="rounded-lg">True or False</SelectItem>
                                                        <SelectItem value="fill-in-the-blank" className="rounded-lg">Fill in the Blank</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-600">Required</span>
                                                    <Switch
                                                        checked={activeQuestion.isRequired}
                                                        onCheckedChange={(v) => updateQuestion(activeQuestion.id, { isRequired: v })}
                                                    />
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-slate-50 rounded-xl">
                                                            <MoreHorizontal className="h-5 w-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[200px] rounded-xl border-slate-100 shadow-xl p-2">
                                                        <DropdownMenuItem className="rounded-lg gap-2 font-medium"> <Save className="h-4 w-4" /> Save Template</DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-lg gap-2 font-medium"> <Plus className="h-4 w-4" /> Duplicate</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="rounded-lg gap-2 font-medium text-red-500 hover:text-red-600"> <Trash2 className="h-4 w-4" /> Delete Question</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-slate-800">
                                                <HelpCircle className="h-4 w-4 text-slate-400" />
                                                <span className="text-sm font-black uppercase tracking-widest">Question {quiz.questions.indexOf(activeQuestion) + 1}</span>
                                            </div>
                                            <div className="group relative">
                                                <Textarea
                                                    placeholder="Enter your question here..."
                                                    className="text-lg min-h-[100px] py-4 leading-relaxed bg-[#F8FAFC]"
                                                    value={activeQuestion.text}
                                                    onChange={(e) => updateQuestion(activeQuestion.id, { text: e.target.value })}
                                                />
                                                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm border border-slate-100">
                                                        <ImageIcon className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm border border-slate-100">
                                                        <Video className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm border border-slate-100">
                                                        <Mic className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {activeQuestion.type === "multiple-choice" || activeQuestion.type === "true-or-false" ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-[13px] font-black uppercase tracking-widest text-slate-400">
                                                        {activeQuestion.type === "true-or-false" ? "Correct Answer" : "Choices"}
                                                    </h4>
                                                    {activeQuestion.type === "multiple-choice" && (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multiple answer</span>
                                                            <Switch
                                                                checked={activeQuestion.allowMultipleAnswers}
                                                                onCheckedChange={(v) => updateQuestion(activeQuestion.id, { allowMultipleAnswers: v })}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    {activeQuestion.options.map((option, oIdx) => (
                                                        <div key={option.id} className="flex items-center gap-4 group">
                                                            <button
                                                                onClick={() => toggleCorrectOption(activeQuestion.id, option.id)}
                                                                className={cn(
                                                                    "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                                    option.isCorrect ? "bg-primary border-primary text-white" : "border-slate-200 hover:border-primary/50"
                                                                )}
                                                            >
                                                                {option.isCorrect && <CheckCircle2 className="h-4 w-4" />}
                                                            </button>
                                                            <div className="flex-1 relative">
                                                                <input
                                                                    className={cn(
                                                                        "w-full h-12 bg-slate-50/50 rounded-xl px-4 text-sm font-medium border-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20",
                                                                        option.isCorrect && "bg-primary/5",
                                                                        activeQuestion.type === "true-or-false" && "bg-slate-100/50 cursor-not-allowed"
                                                                    )}
                                                                    placeholder={activeQuestion.type === "true-or-false" ? option.text : `Choice ${oIdx + 1}`}
                                                                    value={option.text}
                                                                    readOnly={activeQuestion.type === "true-or-false"}
                                                                    onChange={(e) => updateOption(activeQuestion.id, option.id, e.target.value)}
                                                                />
                                                            </div>
                                                            {activeQuestion.type === "multiple-choice" && (
                                                                <div className="flex items-center gap-2">
                                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-slate-600 rounded-xl">
                                                                        <GripVertical className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 text-slate-300 hover:text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => deleteOption(activeQuestion.id, option.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {activeQuestion.type === "multiple-choice" && (
                                                        <Button
                                                            variant="ghost"
                                                            className="h-12 w-full border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 hover:bg-slate-50 font-bold transition-all mt-2"
                                                            onClick={() => addOption(activeQuestion.id)}
                                                        >
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Add answers
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                        ) : (
                                            <div className="space-y-4">
                                                <h4 className="text-[13px] font-black uppercase tracking-widest text-slate-400">Correct Answer</h4>
                                                <Input
                                                    className="h-12 rounded-2xl bg-slate-50 border-none font-medium px-6 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                                                    placeholder="Enter the expected answer..."
                                                    value={activeQuestion.correctAnswer || ""}
                                                    onChange={(e) => updateQuestion(activeQuestion.id, { correctAnswer: e.target.value })}
                                                />
                                            </div>
                                        )}

                                        <Separator className="bg-slate-100/50" />

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Randomize Order</Label>
                                                </div>
                                                <Select
                                                    value={activeQuestion.randomizeOrder ? "yes" : "no"}
                                                    onValueChange={(v) => updateQuestion(activeQuestion.id, { randomizeOrder: v === "yes" })}
                                                >
                                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-600">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                        <SelectItem value="no">Keep choices in current order</SelectItem>
                                                        <SelectItem value="yes">Shuffle choices randomly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Estimation time</Label>
                                                <div className="flex items-center bg-slate-50 rounded-xl px-4 h-11 border-none">
                                                    <input
                                                        type="number"
                                                        className="bg-transparent border-none focus-visible:outline-none w-full font-bold text-slate-600 text-center"
                                                        value={activeQuestion.estimationTime}
                                                        onChange={(e) => updateQuestion(activeQuestion.id, { estimationTime: parseInt(e.target.value) || 0 })}
                                                    />
                                                    <span className="text-slate-400 font-bold ml-2">Mins</span>
                                                    <Clock className="h-4 w-4 text-slate-300 ml-4" />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Mark as point</Label>
                                                <div className="flex items-center bg-slate-50 rounded-xl px-4 h-11 border-none group">
                                                    <input
                                                        type="number"
                                                        className="bg-transparent border-none focus-visible:outline-none w-full font-bold text-slate-600 text-center"
                                                        value={activeQuestion.points}
                                                        onChange={(e) => updateQuestion(activeQuestion.id, { points: parseInt(e.target.value) || 0 })}
                                                    />
                                                    <span className="text-slate-400 font-bold ml-2">Points</span>
                                                    <div className="h-5 w-5 rounded-full bg-orange-400 flex items-center justify-center text-white ml-4">
                                                        <Zap className="h-3 w-3 fill-current" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-center">
                                    <Button
                                        variant="outline"
                                        className="rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 h-14 w-[300px] hover:bg-slate-50 transition-all font-bold group"
                                        onClick={addQuestion}
                                    >
                                        <Plus className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                                        Add another question
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Keyboard Shortcut Hints */}
                    <footer className="h-12 bg-white border-t border-[#EEF2F6] px-8 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Keyboard className="h-4 w-4" />
                                <span className="text-xs font-semibold">Shortcuts</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold bg-slate-50 shadow-sm text-slate-500">Cmd</kbd>
                                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold bg-slate-50 shadow-sm text-slate-500">S</kbd>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 ml-1">Save</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold bg-slate-50 shadow-sm text-slate-500">Cmd</kbd>
                                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold bg-slate-50 shadow-sm text-slate-500">Enter</kbd>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 ml-1">Publish</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                            <History className="h-4 w-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest tracking-widest tracking-widest tracking-widest">v1.2.0-beta</span>
                        </div>
                    </footer>
                </main>
            </div>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl">
                    <div className="bg-slate-50/50 p-8 border-b border-slate-100">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-primary/10 text-primary border-none">{subject.name}</Badge>
                                <span className="text-slate-400 font-medium">•</span>
                                <span className="text-slate-400 font-medium">{quiz.questions.length} Questions</span>
                            </div>
                            <DialogTitle className="text-3xl font-black">{quiz.title}</DialogTitle>
                        </DialogHeader>
                    </div>
                    <div className="p-8 space-y-12">
                        {quiz.questions.map((q, idx) => (
                            <div key={q.id} className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <span className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold shrink-0">
                                        {idx + 1}
                                    </span>
                                    <div className="space-y-4 flex-1">
                                        <h3 className="text-xl font-bold text-slate-800 leading-relaxed">{q.text}</h3>

                                        {(q.type === "multiple-choice" || q.type === "true-or-false") && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt) => (
                                                    <div
                                                        key={opt.id}
                                                        className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/20 transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-5 w-5 rounded-full border-2 border-slate-200 group-hover:border-primary/40" />
                                                            <span className="font-semibold text-slate-600">{opt.text}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}


                                        {q.type === "fill-in-the-blank" && (
                                            <Input
                                                className="h-12 rounded-2xl bg-white border-2 border-slate-100 font-medium px-6 focus-visible:ring-primary/20"
                                                placeholder="Type your answer here..."
                                                disabled
                                            />
                                        )}

                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <Zap className="h-4 w-4 fill-orange-400 text-orange-400" />
                                                <span className="text-xs font-bold">{q.points} Points</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-400">
                                                <Clock className="h-4 w-4" />
                                                <span className="text-xs font-bold">{q.estimationTime} Mins</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {idx < quiz.questions.length - 1 && <Separator className="bg-slate-100" />}
                            </div>
                        ))}

                        <div className="pt-8 flex justify-center">
                            <Button className="h-12 px-10 rounded-2xl bg-primary font-bold shadow-lg shadow-primary/20" onClick={() => setIsPreviewOpen(false)}>
                                Close Preview
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Settings Side Panel */}
            <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto border-l-0 shadow-2xl p-0">
                    <div className="h-full flex flex-col bg-white">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                            <SheetHeader className="text-left">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">Quiz Configuration</Badge>
                                </div>
                                <SheetTitle className="text-2xl font-black">Global Settings</SheetTitle>
                                <SheetDescription className="text-slate-500 font-medium">
                                    Configure how this quiz behaves for all students.
                                </SheetDescription>
                            </SheetHeader>
                        </div>

                        <div className="flex-1 p-8 space-y-10">
                            {/* General Configuration */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Exam Rules</h3>
                                    <Separator className="flex-1 bg-slate-100" />
                                </div>

                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Time Limit (Minutes)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="number"
                                                className="h-11 rounded-xl bg-slate-50 border-none font-bold"
                                                value={quiz.settings.timeLimit}
                                                onChange={(e) => setQuiz({
                                                    ...quiz,
                                                    settings: { ...quiz.settings, timeLimit: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                            <span className="text-slate-400 font-bold shrink-0">mins</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Passing Grade (%)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="number"
                                                stroke-current
                                                className="h-11 rounded-xl bg-slate-50 border-none font-bold"
                                                value={quiz.settings.passingGrade}
                                                onChange={(e) => setQuiz({
                                                    ...quiz,
                                                    settings: { ...quiz.settings, passingGrade: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                            <span className="text-slate-400 font-bold shrink-0">%</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Allowed Attempts</Label>
                                        <Select
                                            value={quiz.settings.allowedAttempts.toString()}
                                            onValueChange={(v) => setQuiz({
                                                ...quiz,
                                                settings: { ...quiz.settings, allowedAttempts: parseInt(v) }
                                            })}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                <SelectItem value="1">1 Attempt (Exam Mode)</SelectItem>
                                                <SelectItem value="2">2 Attempts</SelectItem>
                                                <SelectItem value="3">3 Attempts</SelectItem>
                                                <SelectItem value="0">Unlimited (Practice)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </section>

                            {/* Availability Section */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Availability</h3>
                                    <Separator className="flex-1 bg-slate-100" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">Start Date</Label>
                                        <Input
                                            type="date"
                                            className="h-11 rounded-xl bg-slate-50 border-none font-bold cursor-pointer"
                                            value={quiz.settings.availability.startDate}
                                            onChange={(e) => setQuiz({
                                                ...quiz,
                                                settings: {
                                                    ...quiz.settings,
                                                    availability: { ...quiz.settings.availability, startDate: e.target.value }
                                                }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-slate-700">End Date</Label>
                                        <Input
                                            type="date"
                                            className="h-11 rounded-xl bg-slate-50 border-none font-bold cursor-pointer"
                                            value={quiz.settings.availability.endDate}
                                            onChange={(e) => setQuiz({
                                                ...quiz,
                                                settings: {
                                                    ...quiz.settings,
                                                    availability: { ...quiz.settings.availability, endDate: e.target.value }
                                                }
                                            })}
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium italic">
                                    Learners will be automatically blocked from starting the quiz outside this window.
                                </p>
                            </section>


                            {/* Proctoring & Security */}
                            <section className="space-y-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                        <Zap className="h-4 w-4 fill-current" />
                                    </div>
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-600">Security & Proctoring</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-[13px] font-bold text-slate-800">Prevent Screenshots</Label>
                                            <p className="text-[11px] text-slate-500 font-medium">Blocks PRTSC and copy-paste on desktop.</p>
                                        </div>
                                        <Switch
                                            checked={quiz.settings.proctoring.preventScreenshots}
                                            onCheckedChange={(v) => setQuiz({
                                                ...quiz,
                                                settings: {
                                                    ...quiz.settings,
                                                    proctoring: { ...quiz.settings.proctoring, preventScreenshots: v }
                                                }
                                            })}
                                        />
                                    </div>

                                    <Separator className="bg-slate-200/50" />

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-[13px] font-bold text-slate-800">Tab Switch Warning</Label>
                                            <p className="text-[11px] text-slate-500 font-medium">Warn or auto-submit if student leaves tab.</p>
                                        </div>
                                        <Switch
                                            checked={quiz.settings.proctoring.tabSwitchDetection}
                                            onCheckedChange={(v) => setQuiz({
                                                ...quiz,
                                                settings: {
                                                    ...quiz.settings,
                                                    proctoring: { ...quiz.settings.proctoring, tabSwitchDetection: v }
                                                }
                                            })}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Options */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[13px] font-bold text-slate-800">Shuffle Question Order</Label>
                                    <Switch
                                        checked={quiz.settings.shuffleQuestions}
                                        onCheckedChange={(v) => setQuiz({
                                            ...quiz,
                                            settings: { ...quiz.settings, shuffleQuestions: v }
                                        })}
                                    />
                                </div>
                            </section>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/30">
                            <Button
                                className="w-full h-12 rounded-2xl bg-primary font-bold shadow-lg shadow-primary/20 text-white"
                                onClick={() => {
                                    setQuiz({ ...quiz, settingsConfigured: true });
                                    setIsSettingsOpen(false);
                                    toast.success("Settings Saved", {
                                        description: "Quiz configuration has been applied."
                                    });
                                }}
                            >
                                Save Configuration
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </TooltipProvider >

    );
}

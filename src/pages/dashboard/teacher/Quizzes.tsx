
import { useState, useMemo } from "react";
import {
    Search,
    Filter,
    Share2,
    MoreHorizontal,
    CheckCircle2,
    ChevronDown,
    FileText,
    ArrowUpDown,
    Trash2,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Tabs,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useSchoolData } from "@/hooks/useSchoolData";
import { cn } from "@/lib/utils";




export default function Quizzes() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { teachers, students } = useSchoolData();
    const { quizzes: allQuizzes, submissions, deleteQuizzes } = useSubjects();

    const teacherProfile = useMemo(() => teachers.find(t => t.id === user?.id), [teachers, user?.id]);
    const avatarByStudentId = useMemo(() => new Map(students.map((student) => [student.id, student.avatarUrl || ""])), [students]);

    const quizzes = useMemo(() => {
        if (!teacherProfile) return [];
        return allQuizzes.filter(q => teacherProfile.subjects.includes(q.subjectId));
    }, [allQuizzes, teacherProfile]);

    const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);

    const getQuizMetrics = (quizId: string) => {
        const quizSubmissions = submissions.filter(s => s.quizId === quizId);
        const totalSubmissions = quizSubmissions.length;

        // Count unique learners
        const uniqueLearners = [...new Set(quizSubmissions.map(s => s.studentId))];

        // Calculate average accuracy
        const avgAccuracy = totalSubmissions > 0
            ? Math.round(quizSubmissions.reduce((acc, curr) => acc + curr.accuracy, 0) / totalSubmissions)
            : 0;

        return {
            totalSubmissions,
            uniqueLearners,
            avgAccuracy
        };
    };
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const filteredQuizzes = quizzes
        .filter(q => {
            const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
            if (activeTab === "all") return matchesSearch;
            if (activeTab === "active") return matchesSearch && q.status === "published";
            if (activeTab === "drafts") return matchesSearch && q.status === "draft";
            return matchesSearch;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const toggleSelect = (id: string) => {
        setSelectedQuizzes(prev =>
            prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedQuizzes.length === filteredQuizzes.length) {
            setSelectedQuizzes([]);
        } else {
            setSelectedQuizzes(filteredQuizzes.map(q => q.id));
        }
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedQuizzes.length} quizzes?`)) {
            deleteQuizzes(selectedQuizzes);
            setSelectedQuizzes([]);
        }
    };


    return (
        <div className="flex flex-col h-full bg-white">
            <header className="p-8 pb-0">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Quiz</h1>
                    <div className="flex items-center gap-3">
                        {selectedQuizzes.length > 0 && (
                            <Button
                                onClick={handleDelete}
                                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-rose-100 transition-all border-none flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete ({selectedQuizzes.length})
                            </Button>
                        )}
                        <Button
                            className="bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-indigo-100 transition-all border-none"
                        >
                            Export
                        </Button>
                        <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 border-slate-200">
                            <MoreHorizontal className="h-5 w-5 text-slate-600" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                        <TabsList className="bg-transparent h-auto p-0 gap-8">
                            <TabsTrigger
                                value="all"
                                className="px-0 py-4 lg:py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-[#6366F1] data-[state=active]:text-[#6366F1] rounded-none font-bold text-slate-500 hover:text-slate-700 transition-all"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="active"
                                className="px-0 py-4 lg:py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-[#6366F1] data-[state=active]:text-[#6366F1] rounded-none font-bold text-slate-500 hover:text-slate-700 transition-all"
                            >
                                Active
                            </TabsTrigger>
                            <TabsTrigger
                                value="drafts"
                                className="px-0 py-4 lg:py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-[#6366F1] data-[state=active]:text-[#6366F1] rounded-none font-bold text-slate-500 hover:text-slate-700 transition-all"
                            >
                                Drafts
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

            </header>

            <main className="flex-1 p-8 overflow-y-auto">
                {/* Filters & Search */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="rounded-xl border-slate-200 font-bold text-slate-600 gap-2 h-10 px-4">
                                    All Status <span className="text-slate-400 font-medium">(20)</span>
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-xl border-slate-100 shadow-xl">
                                <DropdownMenuItem className="font-semibold">All Status</DropdownMenuItem>
                                <DropdownMenuItem className="font-semibold">Completed</DropdownMenuItem>
                                <DropdownMenuItem className="font-semibold">In Progress</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" className="rounded-xl font-bold text-slate-600 gap-2 h-10 px-4 hover:bg-slate-50">
                            <Filter className="h-4 w-4" />
                            Add Filter
                        </Button>
                    </div>

                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search..."
                            className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50/50 border-none font-medium focus-visible:ring-1 focus-visible:ring-indigo-100 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-[2rem] border border-slate-100 overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-4 pl-8 w-12">
                                    <div
                                        className={cn(
                                            "h-5 w-5 border-2 rounded transition-all cursor-pointer flex items-center justify-center",
                                            selectedQuizzes.length === filteredQuizzes.length && filteredQuizzes.length > 0
                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                : "border-slate-200"
                                        )}
                                        onClick={toggleSelectAll}
                                    >
                                        {selectedQuizzes.length === filteredQuizzes.length && filteredQuizzes.length > 0 && <Check className="h-3 w-3" />}
                                    </div>
                                </th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600 transition-colors">
                                        Quiz name
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600 transition-colors">
                                        Status
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Learners</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">
                                    <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600 transition-colors">
                                        Accuracy
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600 transition-colors">
                                        Assigned
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Assigned by</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredQuizzes.map((quiz) => (
                                <tr
                                    key={quiz.id}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        if (quiz.status === "draft") {
                                            navigate(`/teacher/subjects/${quiz.subjectId}/quizzes/${quiz.id}`);
                                        } else {
                                            navigate(`/teacher/assignments/quizzes/${quiz.id}/analytics`);
                                        }
                                    }}
                                >
                                    <td className="p-4 pl-8" onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelect(quiz.id);
                                    }}>
                                        <div
                                            className={cn(
                                                "h-5 w-5 border-2 rounded transition-all flex items-center justify-center",
                                                selectedQuizzes.includes(quiz.id)
                                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                                    : "border-slate-200 group-hover:border-indigo-200"
                                            )}
                                        >
                                            {selectedQuizzes.includes(quiz.id) && <Check className="h-3 w-3" />}
                                        </div>
                                    </td>
                                    <td className="p-4 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                {quiz.status === "published" ? <Share2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-800 leading-tight">{quiz.title}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        {quiz.status === "published" ? "LIVE" : "DRAFT"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge
                                            className={cn(
                                                "border-none h-8 px-3 rounded-lg font-bold flex items-center gap-2 w-fit",
                                                quiz.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                quiz.status === "published" ? "bg-emerald-500" : "bg-slate-400"
                                            )} />
                                            {quiz.status === "published" ? "Published" : "Draft"}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center">
                                            {getQuizMetrics(quiz.id).uniqueLearners.length > 0 ? (
                                                <div className="flex -space-x-2">
                                                    {getQuizMetrics(quiz.id).uniqueLearners.slice(0, 3).map((learnerId, _) => (
                                                        <Avatar key={learnerId} className="h-7 w-7 ring-2 ring-white">
                                                            <AvatarImage src={avatarByStudentId.get(learnerId) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${learnerId}`} />
                                                            <AvatarFallback>?</AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                    {getQuizMetrics(quiz.id).uniqueLearners.length > 3 && (
                                                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 ring-2 ring-white">
                                                            +{getQuizMetrics(quiz.id).uniqueLearners.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-300 italic">No learners</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center uppercase font-black text-slate-900 text-[11px]">
                                            {getQuizMetrics(quiz.id).totalSubmissions > 0 ? (
                                                <Badge className={cn(
                                                    "border-none font-bold",
                                                    getQuizMetrics(quiz.id).avgAccuracy >= 80 ? "bg-emerald-50 text-emerald-600" :
                                                        getQuizMetrics(quiz.id).avgAccuracy >= 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {getQuizMetrics(quiz.id).avgAccuracy}%
                                                </Badge>
                                            ) : (
                                                <span className="opacity-50 text-slate-300">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-bold text-slate-600">
                                            {new Date(quiz.createdAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 ring-1 ring-slate-100">
                                                <AvatarImage src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
                                                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-bold text-slate-600">{user?.name}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
            </main>
        </div>
    );
}

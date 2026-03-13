import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, HelpCircle, ArrowRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

export default function StudentQuizzes() {
    const { user } = useAuth();
    const { studentSubjects } = useRegistrationData();
    const { quizzes: allQuizzes, subjects } = useSubjects();
    const navigate = useNavigate();

    const quizzes = useMemo(() => {
        const assignedIds = studentSubjects
            .filter(ss => ss.studentId === user?.id)
            .map(ss => ss.subjectId);
        return allQuizzes.filter(q => assignedIds.includes(q.subjectId));
    }, [allQuizzes, studentSubjects, user?.id]);

    // Only show published quizzes, sorted by creation date (newest first)
    const publishedQuizzes = quizzes
        .filter(q => q.status === "published")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getSubjectName = (subjectId: string) => {
        return subjects.find(s => s.id === subjectId)?.name || "General";
    };

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-8 py-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Available Quizzes</h1>
                <p className="text-slate-500 font-medium">Test your knowledge and track your progress.</p>
            </div>

            {publishedQuizzes.length === 0 ? (
                <div className="bg-slate-50 rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
                    <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <HelpCircle className="h-10 w-10 text-slate-300" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">No quizzes available yet</h2>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">Check back later for new assessments assigned by your teachers.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {publishedQuizzes.map((quiz) => (
                        <Card
                            key={quiz.id}
                            className="group hover:shadow-xl transition-all duration-300 border-slate-100 overflow-hidden cursor-pointer rounded-[1.5rem]"
                            onClick={() => navigate(`/student/quizzes/${quiz.id}`)}
                        >
                            <CardContent className="p-0">
                                <div className="p-6 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-bold px-3 py-1">
                                            {getSubjectName(quiz.subjectId)}
                                        </Badge>
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                                            {quiz.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 font-medium">
                                            {quiz.description || "Master the concepts of this subject with this comprehensive assessment."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span className="flex items-center gap-1.5"><HelpCircle className="h-4 w-4 text-indigo-400" /> {quiz.questions.length} Qs</span>
                                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-400" /> {quiz.settings?.timeLimit || 0} Mins</span>
                                    </div>
                                </div>
                                <div className="border-t border-slate-50 p-4 bg-slate-50/30 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>Ends {quiz.settings?.availability?.endDate ? new Date(quiz.settings.availability.endDate).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform text-indigo-500" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

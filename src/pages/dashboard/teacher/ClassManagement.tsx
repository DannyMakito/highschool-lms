
import { useMemo, useState } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useAssignments } from "@/hooks/useAssignments";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Plus,
    BookOpen,
    GraduationCap,
    School,
    ChevronRight,
    ArrowLeft,
    Eye,
    BarChart3
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { buildGradebookScoreMap, calculateWeightedGradebookTotal, normalizeMaxPoints } from "@/lib/gradebook";
import type { AssignmentGroup, AssignmentSubmission, Quiz, QuizSubmission, Student, StudentGradebookScore } from "@/types";

type StudentAssessmentRow = {
    key: string;
    title: string;
    kind: "assignment" | "quiz";
    dueDate: string | null;
    status: string;
    groupName: string;
    groupWeightPercentage: number;
    rawScore: number | null;
    rawMax: number;
    percentage: number | null;
    countsTowardsFinal: boolean;
};

const formatDateLabel = (value?: string | null) => {
    if (!value) return "No date";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "No date";
    return parsed.toLocaleDateString();
};

const getStatusClassName = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("graded") || normalized.includes("completed")) return "bg-emerald-600 text-white";
    if (normalized.includes("submitted")) return "bg-sky-600 text-white";
    if (normalized.includes("open")) return "bg-amber-500 text-white";
    if (normalized.includes("upcoming")) return "bg-slate-500 text-white";
    if (normalized.includes("missing") || normalized.includes("closed")) return "bg-rose-600 text-white";
    return "bg-muted text-foreground";
};

export default function SchoolClassManagement() {
    const { user, role } = useAuth();
    const { classes, students, addSchoolClass, addStudent, addStudentToSchoolClass } = useSchoolData();
    const { grades, registerClasses, subjectClasses, getSubjectClassStudents, getSubjectClassEnrollment, getRegisterClassStudents } = useRegistrationData();
    const { assignments, submissions: assignmentSubmissions } = useAssignments();
    const { subjects, quizzes, submissions: quizSubmissions } = useSubjects();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [selectedSchoolClassId, setSelectedSchoolClassId] = useState<string | null>(null);
    const [viewingClassId, setViewingClassId] = useState<string | null>(null);
    const [viewingClassType, setViewingClassType] = useState<'subject' | 'register'>('subject');
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
    const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<Student | null>(null);
    const [subjectGradebookGroups, setSubjectGradebookGroups] = useState<AssignmentGroup[]>([]);
    const [studentGradebookScores, setStudentGradebookScores] = useState<StudentGradebookScore[]>([]);
    const [isLoadingStudentGrades, setIsLoadingStudentGrades] = useState(false);

    const [newSchoolClass, setNewSchoolClass] = useState({
        name: "",
        subjectId: "",
    });

    const [newStudent, setNewStudent] = useState({
        name: "",
        administrationNumber: "",
        gender: "",
        grade: "",
        studentClass: "",
    });

    const isTeacher = role === "teacher";
    const teacherAssignedSubjectClasses = subjectClasses.filter(sc => sc.teacherId === user?.id);
    const teacherAssignedRegisterClasses = registerClasses.filter(rc => rc.classTeacherId === user?.id);
    const allTeacherClasses = [
        ...teacherAssignedSubjectClasses.map(sc => ({ ...sc, type: 'subject' as const })),
        ...teacherAssignedRegisterClasses.map(rc => ({ ...rc, type: 'register' as const }))
    ];

    const handleCreateSchoolClass = () => {
        if (!newSchoolClass.name || !newSchoolClass.subjectId) {
            toast.error("Please fill in class name and subject");
            return;
        }
        addSchoolClass({
            ...newSchoolClass,
            teacherId: user?.id || "1",
            studentIds: []
        });
        setIsCreateOpen(false);
        setNewSchoolClass({ name: "", subjectId: "" });
        toast.success("SchoolClass created successfully");
    };

    const handleAddStudent = () => {
        if (!newStudent.name || !newStudent.administrationNumber || !newStudent.gender || !newStudent.grade || !newStudent.studentClass || !selectedSchoolClassId) {
            toast.error("Please fill in all student details");
            return;
        }

        // In a real app, we might check if student already exists
        const student = addStudent(newStudent);
        addStudentToSchoolClass(selectedSchoolClassId, student.id);

        setIsAddStudentOpen(false);
        setNewStudent({ name: "", administrationNumber: "", gender: "", grade: "", studentClass: "" });
        toast.success("Student added to class");
    };

    const viewedClassStudents = useMemo(() => {
        if (!viewingClassId) return [];
        return viewingClassType === "subject"
            ? getSubjectClassStudents(viewingClassId)
            : getRegisterClassStudents(viewingClassId);
    }, [getRegisterClassStudents, getSubjectClassStudents, viewingClassId, viewingClassType]);

    const viewedSubjectClass = useMemo(() => {
        if (viewingClassType !== "subject") return null;
        return subjectClasses.find((subjectClass) => subjectClass.id === viewingClassId) || null;
    }, [subjectClasses, viewingClassId, viewingClassType]);

    const viewedSubject = useMemo(() => {
        if (!viewedSubjectClass) return null;
        return subjects.find((subject) => subject.id === viewedSubjectClass.subjectId) || null;
    }, [subjects, viewedSubjectClass]);

    const scoreMap = useMemo(() => buildGradebookScoreMap(studentGradebookScores), [studentGradebookScores]);
    const groupById = useMemo(
        () => new Map(subjectGradebookGroups.map((group) => [group.id, group])),
        [subjectGradebookGroups]
    );

    const latestAssignmentSubmissions = useMemo(() => {
        const map = new Map<string, AssignmentSubmission>();
        if (!selectedStudentForGrades) return map;

        assignmentSubmissions
            .filter((submission) => submission.studentId === selectedStudentForGrades.id)
            .forEach((submission) => {
                const current = map.get(submission.assignmentId);
                if (!current) {
                    map.set(submission.assignmentId, submission);
                    return;
                }
                const currentTime = new Date(current.submittedAt || "").getTime();
                const nextTime = new Date(submission.submittedAt || "").getTime();
                if (nextTime >= currentTime) {
                    map.set(submission.assignmentId, submission);
                }
            });

        return map;
    }, [assignmentSubmissions, selectedStudentForGrades]);

    const latestQuizSubmissions = useMemo(() => {
        const map = new Map<string, QuizSubmission>();
        if (!selectedStudentForGrades) return map;

        quizSubmissions
            .filter((submission) => submission.studentId === selectedStudentForGrades.id)
            .forEach((submission) => {
                const current = map.get(submission.quizId);
                if (!current) {
                    map.set(submission.quizId, submission);
                    return;
                }
                const currentTime = new Date(current.completedAt || "").getTime();
                const nextTime = new Date(submission.completedAt || "").getTime();
                if (nextTime >= currentTime) {
                    map.set(submission.quizId, submission);
                }
            });

        return map;
    }, [quizSubmissions, selectedStudentForGrades]);

    const studentAssessmentRows = useMemo<StudentAssessmentRow[]>(() => {
        if (!selectedStudentForGrades || !viewedSubjectClass) return [];

        const subjectAssignments = assignments
            .filter((assignment) => assignment.subjectId === viewedSubjectClass.subjectId && assignment.status === "published")
            .map((assignment) => {
                const submission = latestAssignmentSubmissions.get(assignment.id) || null;
                const gradeVisible = Boolean(submission && submission.status === "graded");
                const rawScore = gradeVisible ? Number(submission?.totalGrade || 0) : null;
                const rawMax = Number(assignment.totalMarks || 0);
                const percentage = rawScore !== null && rawMax > 0 ? (rawScore / rawMax) * 100 : null;
                const availableAt = assignment.availableFrom ? new Date(assignment.availableFrom).getTime() : null;
                const dueAt = new Date(assignment.dueDate).getTime();
                const now = Date.now();

                let status = "Open";
                if (submission?.status === "graded") {
                    status = "Graded";
                } else if (submission) {
                    status = "Submitted";
                } else if (availableAt && availableAt > now) {
                    status = "Upcoming";
                } else if (dueAt < now) {
                    status = "Missing";
                }

                const group = assignment.groupId ? groupById.get(assignment.groupId) : undefined;

                return {
                    key: `assignment:${assignment.id}`,
                    title: assignment.title,
                    kind: "assignment" as const,
                    dueDate: assignment.dueDate,
                    status,
                    groupName: group?.name || "Unlinked",
                    groupWeightPercentage: Number(group?.weightPercentage || 0),
                    rawScore,
                    rawMax,
                    percentage,
                    countsTowardsFinal: assignment.countsTowardsFinal ?? true,
                };
            });

        const subjectQuizzes = quizzes
            .filter((quiz) => quiz.subjectId === viewedSubjectClass.subjectId && quiz.status === "published")
            .map((quiz) => {
                const submission = latestQuizSubmissions.get(quiz.id) || null;
                const rawScore = submission ? Number(submission.score || 0) : null;
                const rawMax = Number(submission?.totalPoints || quiz.pointsPossible || 0);
                const percentage = rawScore !== null && rawMax > 0 ? (rawScore / rawMax) * 100 : null;
                const endDate = quiz.settings?.availability?.endDate || null;
                const startDate = quiz.settings?.availability?.startDate || null;
                const now = Date.now();
                const startAt = startDate ? new Date(startDate).getTime() : null;
                const endAt = endDate ? new Date(endDate).getTime() : null;

                let status = "Open";
                if (submission?.status === "completed") {
                    status = "Completed";
                } else if (submission?.status === "need-review") {
                    status = "Needs Review";
                } else if (startAt && startAt > now) {
                    status = "Upcoming";
                } else if (endAt && endAt < now) {
                    status = "Closed";
                }

                const group = quiz.groupId ? groupById.get(quiz.groupId) : undefined;

                return {
                    key: `quiz:${quiz.id}`,
                    title: quiz.title,
                    kind: "quiz" as const,
                    dueDate: endDate,
                    status,
                    groupName: group?.name || "Unlinked",
                    groupWeightPercentage: Number(group?.weightPercentage || 0),
                    rawScore,
                    rawMax,
                    percentage,
                    countsTowardsFinal: quiz.countsTowardsFinal ?? true,
                };
            });

        return [...subjectAssignments, ...subjectQuizzes].sort((a, b) => {
            const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return bTime - aTime;
        });
    }, [
        assignments,
        groupById,
        latestAssignmentSubmissions,
        latestQuizSubmissions,
        quizzes,
        selectedStudentForGrades,
        viewedSubjectClass,
    ]);

    const selectedStudentYearMark = useMemo(() => {
        if (!selectedStudentForGrades) return 0;
        return calculateWeightedGradebookTotal(subjectGradebookGroups, scoreMap, selectedStudentForGrades.id);
    }, [scoreMap, selectedStudentForGrades, subjectGradebookGroups]);

    const openStudentGrades = async (student: Student) => {
        if (!viewedSubjectClass) {
            toast.error("Learner grade view is only available in subject classes.");
            return;
        }

        setSelectedStudentForGrades(student);
        setIsLoadingStudentGrades(true);

        try {
            const [groupsRes, scoresRes] = await Promise.all([
                supabase
                    .from("assignment_groups")
                    .select("*")
                    .eq("subject_id", viewedSubjectClass.subjectId)
                    .order("order", { ascending: true }),
                supabase
                    .from("student_gradebook_scores")
                    .select("*")
                    .eq("subject_id", viewedSubjectClass.subjectId)
                    .eq("student_id", student.id),
            ]);

            if (groupsRes.error || scoresRes.error) {
                console.error("Failed to load learner gradebook details", {
                    groupsError: groupsRes.error,
                    scoresError: scoresRes.error,
                });
                toast.error("Could not load learner grade data");
                setSubjectGradebookGroups([]);
                setStudentGradebookScores([]);
                return;
            }

            setSubjectGradebookGroups((groupsRes.data || []).map((group) => ({
                id: group.id,
                subjectId: group.subject_id,
                name: group.name,
                weightPercentage: Number(group.weight_percentage || 0),
                maxPoints: normalizeMaxPoints(group.max_points),
                order: group.order ?? 0,
            })));

            setStudentGradebookScores((scoresRes.data || []).map((entry) => ({
                id: entry.id,
                subjectId: entry.subject_id,
                assignmentGroupId: entry.assignment_group_id,
                studentId: entry.student_id,
                score: Number(entry.score || 0),
                feedback: entry.feedback,
                updatedAt: entry.updated_at,
            })));
        } catch (error) {
            console.error("Unexpected learner grade load error", error);
            toast.error("Could not load learner grade data");
            setSubjectGradebookGroups([]);
            setStudentGradebookScores([]);
        } finally {
            setIsLoadingStudentGrades(false);
        }
    };

    const closeStudentGradesDialog = () => {
        setSelectedStudentForGrades(null);
        setSubjectGradebookGroups([]);
        setStudentGradebookScores([]);
        setIsLoadingStudentGrades(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">My Classes</h1>
                    <p className="text-muted-foreground">View your assigned teaching groups and class rosters.</p>
                </div>

                {!isTeacher && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 font-bold">
                                <Plus className="mr-2 h-4 w-4" />
                                Create New SchoolClass
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create SchoolClass</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="className">SchoolClass Name</Label>
                                    <Input
                                        id="className"
                                        placeholder="e.g. Grade 10B - Advanced Math"
                                        value={newSchoolClass.name}
                                        onChange={(e) => setNewSchoolClass({ ...newSchoolClass, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Select
                                        value={newSchoolClass.subjectId}
                                        onValueChange={(v) => setNewSchoolClass({ ...newSchoolClass, subjectId: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name} (Grade {s.gradeTier})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateSchoolClass}>Create SchoolClass</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {!viewingClassId ? (
                <Card className="border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-black">Class Name</TableHead>
                                <TableHead className="font-black">Type</TableHead>
                                <TableHead className="font-black">Subject/Grade</TableHead>
                                <TableHead className="font-black">Students</TableHead>
                                <TableHead className="font-black text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teacherAssignedSubjectClasses.map((sc) => {
                                const subject = subjects.find(s => s.id === sc.subjectId);
                                const grade = grades.find(g => g.id === sc.gradeId);
                                const enrolled = getSubjectClassEnrollment(sc.id);
                                return (
                                    <TableRow key={`subject-${sc.id}`} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => { setViewingClassId(sc.id); setViewingClassType('subject'); }}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded bg-indigo-500/10 text-indigo-500">
                                                    <School className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold">{sc.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-200">Subject Class</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <BookOpen className="h-4 w-4" />
                                                {subject?.name || "Regular Subject"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-mono bg-primary/10 text-primary border-none">
                                                {enrolled} / {sc.capacity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {teacherAssignedRegisterClasses.map((rc) => {
                                const grade = grades.find(g => g.id === rc.gradeId);
                                const enrolled = getRegisterClassStudents(rc.id).length;
                                return (
                                    <TableRow key={`register-${rc.id}`} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => { setViewingClassId(rc.id); setViewingClassType('register'); }}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded bg-green-500/10 text-green-500">
                                                    <GraduationCap className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold">{rc.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-200">Home Class</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-medium">{grade?.name}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-mono bg-primary/10 text-primary border-none">
                                                {enrolled} / {rc.maxStudents}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {teacherAssignedSubjectClasses.length === 0 && teacherAssignedRegisterClasses.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                        No assigned classes found. Please contact the principal.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => setViewingClassId(null)} className="font-bold">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Classes
                        </Button>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <h2 className="text-2xl font-black">
                                {viewingClassType === 'subject' 
                                    ? subjectClasses.find(sc => sc.id === viewingClassId)?.name
                                    : registerClasses.find(rc => rc.id === viewingClassId)?.name
                                }
                            </h2>
                            <Badge variant="outline">
                                {viewingClassType === 'subject' ? getSubjectClassEnrollment(viewingClassId || "") : getRegisterClassStudents(viewingClassId || "").length} Students Enrolled
                            </Badge>
                        </div>
                    </div>

                    <Card className="border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black">Name</TableHead>
                                    <TableHead className="font-black">Admin Number</TableHead>
                                    <TableHead className="font-black">Gender</TableHead>
                                    <TableHead className="font-black">Grade/Class</TableHead>
                                    <TableHead className="font-black text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewedClassStudents.map((student) => {
                                    return (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs border border-primary/10">
                                                        {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                                                    </div>
                                                    {student.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{student.administrationNumber}</TableCell>
                                            <TableCell>{student.gender}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-slate-50">Grade {student.grade}{student.studentClass}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="View learner details"
                                                        onClick={() => setSelectedStudentForDetails(student)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={viewingClassType === "subject" ? "View learner grades" : "Only available for subject classes"}
                                                        disabled={viewingClassType !== "subject"}
                                                        onClick={() => void openStudentGrades(student)}
                                                    >
                                                        <BarChart3 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {(viewedClassStudents.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                            No students enrolled in this class yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* Add Student Dialog */}
            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enroll New Student</DialogTitle>
                        <DialogDescription>Add a learner to your {classes.find(c => c.id === selectedSchoolClassId)?.name} class.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="sname">Student Name</Label>
                            <Input
                                id="sname"
                                placeholder="e.g. Alice Wong"
                                value={newStudent.name}
                                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="adminNo">Administration Number</Label>
                            <Input
                                id="adminNo"
                                placeholder="e.g. SCH-2024-001"
                                value={newStudent.administrationNumber}
                                onChange={(e) => setNewStudent({ ...newStudent, administrationNumber: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select
                                value={newStudent.gender}
                                onValueChange={(v) => setNewStudent({ ...newStudent, gender: v })}
                            >
                                <SelectTrigger id="gender">
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="grade">Grade Level</Label>
                                <Select
                                    value={newStudent.grade}
                                    onValueChange={(v) => setNewStudent({ ...newStudent, grade: v })}
                                >
                                    <SelectTrigger id="grade">
                                        <SelectValue placeholder="Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="8">Grade 8</SelectItem>
                                        <SelectItem value="9">Grade 9</SelectItem>
                                        <SelectItem value="10">Grade 10</SelectItem>
                                        <SelectItem value="11">Grade 11</SelectItem>
                                        <SelectItem value="12">Grade 12</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="studentClass">Class</Label>
                                <Input
                                    id="studentClass"
                                    placeholder="e.g. A, B, C"
                                    value={newStudent.studentClass}
                                    onChange={(e) => setNewStudent({ ...newStudent, studentClass: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddStudent}>Enroll Student</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(selectedStudentForDetails)}
                onOpenChange={(open) => {
                    if (!open) setSelectedStudentForDetails(null);
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Learner Details</DialogTitle>
                        <DialogDescription>
                            Profile and enrollment information for {selectedStudentForDetails?.name || "selected learner"}.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedStudentForDetails ? (
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name</p>
                                    <p className="mt-2 font-bold">{selectedStudentForDetails.name || "-"}</p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Administration Number</p>
                                    <p className="mt-2 font-bold">{selectedStudentForDetails.administrationNumber || "-"}</p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email</p>
                                    <p className="mt-2 font-bold break-all">{selectedStudentForDetails.email || "-"}</p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gender</p>
                                    <p className="mt-2 font-bold">{selectedStudentForDetails.gender || "-"}</p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grade / Class</p>
                                    <p className="mt-2 font-bold">
                                        {selectedStudentForDetails.grade || "-"} {selectedStudentForDetails.studentClass || ""}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Admission Year</p>
                                    <p className="mt-2 font-bold">{selectedStudentForDetails.admissionYear || "-"}</p>
                                </div>
                            </div>
                            <div className="rounded-xl border p-4">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Assigned Subjects</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(selectedStudentForDetails.subjects || []).length > 0 ? (
                                        selectedStudentForDetails.subjects?.map((subject) => (
                                            <Badge key={`${selectedStudentForDetails.id}-${subject.subject_id}`} variant="secondary">
                                                {subject.subject_name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No assigned subjects listed.</p>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Security PIN is intentionally hidden on this teacher view.
                            </p>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(selectedStudentForGrades)}
                onOpenChange={(open) => {
                    if (!open) closeStudentGradesDialog();
                }}
            >
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Subject Grade Snapshot</DialogTitle>
                        <DialogDescription>
                            {selectedStudentForGrades?.name || "Learner"} | {viewedSubject?.name || "Subject"}
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingStudentGrades ? (
                        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                            Loading learner grade data...
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Year Mark</p>
                                    <p className="mt-2 text-3xl font-black">{selectedStudentYearMark.toFixed(1)}%</p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Assessment Records</p>
                                    <p className="mt-2 text-3xl font-black">{studentAssessmentRows.length}</p>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gradebook Categories</p>
                                    <p className="mt-2 text-3xl font-black">{subjectGradebookGroups.length}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border p-4">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Setup Score Categories</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {subjectGradebookGroups.length > 0 ? (
                                        subjectGradebookGroups.map((group) => {
                                            const entry = selectedStudentForGrades
                                                ? scoreMap[`${selectedStudentForGrades.id}:${group.id}`]
                                                : undefined;
                                            return (
                                                <Badge key={group.id} variant="outline">
                                                    {group.name} | {group.weightPercentage}% | {entry ? `${entry.score} / ${normalizeMaxPoints(group.maxPoints)}` : `- / ${normalizeMaxPoints(group.maxPoints)}`}
                                                </Badge>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No gradebook setup exists for this subject yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="font-black">Item</TableHead>
                                            <TableHead className="font-black">Due Date</TableHead>
                                            <TableHead className="font-black">Status</TableHead>
                                            <TableHead className="font-black">Setup Score</TableHead>
                                            <TableHead className="font-black">Grade</TableHead>
                                            <TableHead className="font-black">Final Mark Impact</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentAssessmentRows.map((row) => (
                                            <TableRow key={row.key}>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <p className="font-bold">{row.title}</p>
                                                        <Badge variant="secondary" className="capitalize">{row.kind}</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{formatDateLabel(row.dueDate)}</TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusClassName(row.status)}>{row.status}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <p className="font-semibold">{row.groupName}</p>
                                                        <p className="text-xs text-muted-foreground">{row.groupWeightPercentage}% category weight</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {row.percentage !== null ? (
                                                        <div className="space-y-1">
                                                            <p className="font-bold">{row.percentage.toFixed(1)}%</p>
                                                            <p className="text-xs text-muted-foreground">{row.rawScore?.toFixed(1).replace(/\.0$/, "")} / {row.rawMax.toFixed(1).replace(/\.0$/, "")}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Pending</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {row.percentage !== null && row.countsTowardsFinal ? (
                                                        <p className="font-bold">{((row.percentage / 100) * row.groupWeightPercentage).toFixed(1)}%</p>
                                                    ) : (
                                                        <p className="text-muted-foreground">{row.countsTowardsFinal ? "Tracked" : "Excluded"}</p>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {studentAssessmentRows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    No published assignments or quizzes found for this subject class.
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>


        </div>
    );
}

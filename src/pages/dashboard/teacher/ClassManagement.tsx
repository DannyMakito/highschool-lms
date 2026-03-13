
import { useState } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Users,
    BookOpen,
    UserPlus,
    LayoutGrid,
    MoreHorizontal,
    GraduationCap,
    School,
    ChevronRight,
    ArrowLeft,
    ExternalLink
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

export default function SchoolClassManagement() {
    const { user, role } = useAuth();
    const { classes, students, addSchoolClass, addStudent, addStudentToSchoolClass } = useSchoolData();
    const { grades, subjectClasses, getSubjectClassStudents, getSubjectClassEnrollment } = useRegistrationData();
    const { subjects } = useSubjects();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [selectedSchoolClassId, setSelectedSchoolClassId] = useState<string | null>(null);
    const [viewingClassId, setViewingClassId] = useState<string | null>(null);

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
    const teacherAssignedClasses = subjectClasses.filter(sc => sc.teacherId === user?.id);

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
                                <TableHead className="font-black">Subject</TableHead>
                                <TableHead className="font-black">Grade</TableHead>
                                <TableHead className="font-black">Students</TableHead>
                                <TableHead className="font-black text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teacherAssignedClasses.map((sc) => {
                                const subject = subjects.find(s => s.id === sc.subjectId);
                                const grade = grades.find(g => g.id === sc.gradeId);
                                const enrolled = getSubjectClassEnrollment(sc.id);
                                return (
                                    <TableRow key={sc.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setViewingClassId(sc.id)}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded bg-indigo-500/10 text-indigo-500">
                                                    <School className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold">{sc.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <BookOpen className="h-4 w-4" />
                                                {subject?.name || "Regular Subject"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-medium">{grade?.name}</Badge>
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
                            {teacherAssignedClasses.length === 0 && (
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
                                {subjectClasses.find(sc => sc.id === viewingClassId)?.name}
                            </h2>
                            <Badge variant="outline">
                                {getSubjectClassEnrollment(viewingClassId || "")} Students Enrolled
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
                                {getSubjectClassStudents(viewingClassId || "").map((student) => {
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
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {(getSubjectClassStudents(viewingClassId || "").length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                            No students enrolled in this subject class yet.
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


        </div>
    );
}

import { useMemo, useState } from "react";
import type { Student } from "@/types";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Users, BookOpen, School, Filter, UserCheck, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type StudentForm = {
    firstName: string;
    lastName: string;
    email: string;
    administrationNumber: string;
    admissionYear: string;
    gender: string;
    gradeId: string;
    registerClassId: string;
    status: Student["status"];
    pin: string;
};

export default function StudentDirectory() {
    const {
        grades,
        registerClasses,
        subjectClasses,
        students,
        updateStudent,
        deleteStudent,
        assignSubjectsToStudent,
        getStudentSubjects,
        getStudentSubjectClasses,
    } = useRegistrationData();
    const { subjects } = useSubjects();
    const { teachers } = useSchoolData();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentForm, setStudentForm] = useState<StudentForm | null>(null);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterGrade, setFilterGrade] = useState("all");
    const [filterClass, setFilterClass] = useState("all");

    const selectedStudent = useMemo(() => students.find(student => student.id === selectedStudentId) || null, [students, selectedStudentId]);

    const filteredStudents = students.filter(student => {
        const matchesSearch = (student.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.administrationNumber || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade = filterGrade === "all" || student.gradeId === filterGrade;
        const matchesClass = filterClass === "all" || student.registerClassId === filterClass;
        return matchesSearch && matchesGrade && matchesClass;
    });

    const openProfile = (student: Student) => {
        setSelectedStudentId(student.id);
        setStudentForm({
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            administrationNumber: student.administrationNumber,
            admissionYear: student.admissionYear,
            gender: student.gender,
            gradeId: student.gradeId,
            registerClassId: student.registerClassId,
            status: student.status,
            pin: student.pin,
        });
        setSelectedSubjectIds((student.subjects || []).map(subject => subject.subjectId || subject.subject_id).filter(Boolean));
        setIsProfileOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will remove all their enrollments.`)) return;
        try {
            await deleteStudent(id);
            if (selectedStudentId === id) {
                setIsProfileOpen(false);
                setSelectedStudentId(null);
            }
            toast.success(`Student ${name} removed`);
        } catch (error: any) {
            toast.error(error.message || "Failed to remove student");
        }
    };

    const handleSave = async () => {
        if (!selectedStudent || !studentForm) return;
        if (!studentForm.firstName || !studentForm.lastName || !studentForm.gradeId || !studentForm.registerClassId) {
            toast.error("Please complete the student form before saving");
            return;
        }
        setIsSaving(true);
        try {
            await updateStudent(selectedStudent.id, { ...studentForm });
            await assignSubjectsToStudent(selectedStudent.id, selectedSubjectIds);
            toast.success("Student details updated");
        } catch (error: any) {
            toast.error(error.message || "Failed to update student");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSubject = (subjectId: string) => {
        setSelectedSubjectIds(prev => prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]);
    };

    const availableRegisterClasses = registerClasses.filter(registerClass => !studentForm?.gradeId || registerClass.gradeId === studentForm.gradeId);
    const gradeLevel = grades.find(grade => grade.id === studentForm?.gradeId)?.level;
    const availableSubjects = subjects.filter(subject => !gradeLevel || subject.gradeTier === String(gradeLevel));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Student Directory</h1>
                    <p className="text-muted-foreground">Manage and view all registered learners in the system.</p>
                </div>
                <Button variant="outline" className="border-2 font-bold">Export List</Button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card className="border-2"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div><div><div className="text-2xl font-black">{students.length}</div><div className="text-xs text-muted-foreground">Total Students</div></div></CardContent></Card>
                <Card className="border-2"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10"><UserCheck className="h-6 w-6 text-green-600" /></div><div><div className="text-2xl font-black">{students.filter(student => student.status === "active").length}</div><div className="text-xs text-muted-foreground">Active Units</div></div></CardContent></Card>
                <Card className="border-2"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10"><School className="h-6 w-6 text-blue-600" /></div><div><div className="text-2xl font-black">{registerClasses.length}</div><div className="text-xs text-muted-foreground">Reg Classes</div></div></CardContent></Card>
                <Card className="border-2"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10"><BookOpen className="h-6 w-6 text-purple-600" /></div><div><div className="text-2xl font-black">{subjectClasses.length}</div><div className="text-xs text-muted-foreground">Sub Classes</div></div></CardContent></Card>
            </div>

            <div className="flex flex-wrap gap-4 rounded-xl border-2 bg-muted/30 p-4">
                <div className="relative min-w-[250px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search students..." className="h-11 border-2 pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="h-11 w-[160px] border-2"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {grades.map(grade => <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="h-11 w-[180px] border-2"><SelectValue placeholder="Register Class" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {registerClasses.map(registerClass => <SelectItem key={registerClass.id} value={registerClass.id}>{registerClass.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <Card className="overflow-hidden border-2">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-black uppercase tracking-wider">Student Profile</TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-wider">Admission</TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-wider">Academics</TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-wider">Subjects</TableHead>
                            <TableHead className="text-xs font-black uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-right text-xs font-black uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map(student => {
                            const grade = grades.find(item => item.id === student.gradeId);
                            const regClass = registerClasses.find(item => item.id === student.registerClassId);
                            const subjectCount = student.subjects?.length ?? getStudentSubjects(student.id).length;
                            return (
                                <TableRow key={student.id} className="group transition-colors hover:bg-muted/30">
                                    <TableCell><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-black text-primary shadow-sm transition-transform group-hover:scale-105">{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</div><div><div className="font-black">{student.name}</div><div className="text-[10px] font-bold text-muted-foreground">{student.gender} • {student.admissionYear}</div></div></div></TableCell>
                                    <TableCell className="font-mono text-xs font-bold">{student.administrationNumber}</TableCell>
                                    <TableCell><div className="space-y-1"><Badge variant="outline" className="text-[10px] font-black">{grade?.name}</Badge><div className="text-[10px] font-bold text-muted-foreground">{regClass?.name}</div></div></TableCell>
                                    <TableCell><Badge className="border-purple-200 bg-purple-500/10 text-[10px] font-black text-purple-600">{subjectCount} Subjects</Badge></TableCell>
                                    <TableCell><Badge variant="outline" className={cn("border-2 px-2 py-0 text-[10px] font-black capitalize", student.status === "active" ? "border-green-200 bg-green-50 text-green-600" : student.status === "transferred" ? "border-orange-200 bg-orange-50 text-orange-600" : "border-red-200 bg-red-50 text-red-600")}>{student.status}</Badge></TableCell>
                                    <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary" onClick={() => openProfile(student)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(student.id, student.name)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredStudents.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="h-40 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><Users className="h-8 w-8 opacity-20" /><p className="font-bold">No students found matching your criteria.</p></div></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isProfileOpen} onOpenChange={(open) => { setIsProfileOpen(open); if (!open) setSelectedStudentId(null); }}>
                <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[920px] gap-0 rounded-2xl border-2">
                    {selectedStudent && studentForm && (() => {
                        const grade = grades.find(item => item.id === selectedStudent.gradeId);
                        const regClass = registerClasses.find(item => item.id === selectedStudent.registerClassId);
                        const currentSubjects = selectedStudent.subjects ?? getStudentSubjects(selectedStudent.id);
                        const currentPlacements = getStudentSubjectClasses(selectedStudent.id);

                        return (
                            <div className="flex max-h-[92vh] flex-col">
                                <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground">
                                    <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                                    <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-primary-foreground/10 blur-3xl" />
                                    <div className="relative z-10 flex items-center gap-6">
                                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/20 text-4xl font-black shadow-xl backdrop-blur-md">{selectedStudent.firstName?.charAt(0)}{selectedStudent.lastName?.charAt(0)}</div>
                                        <div><h2 className="text-4xl font-black tracking-tight">{selectedStudent.name}</h2><div className="mt-2 flex items-center gap-2"><Badge className="border-white/20 bg-white/20 text-white backdrop-blur-sm">{selectedStudent.status}</Badge><span className="text-sm font-bold tracking-wide opacity-80">{selectedStudent.administrationNumber}</span></div></div>
                                    </div>
                                </div>

                                <div className="space-y-8 p-8">
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="rounded-xl border-2 bg-muted/20 p-4"><div className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Academic Status</div><div className="text-xl font-black">{grade?.name}</div><div className="text-xs font-bold text-muted-foreground">{regClass?.name} Homeroom</div></div>
                                        <div className="rounded-xl border-2 bg-muted/20 p-4"><div className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact Details</div><div className="truncate text-sm font-bold">{selectedStudent.email || "No email documented"}</div><div className="mt-1 text-[10px] text-muted-foreground">Admission Year: {selectedStudent.admissionYear}</div></div>
                                        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4"><div className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">Security PIN</div><div className="text-2xl font-black tracking-[0.3em] text-primary">{selectedStudent.pin}</div><div className="mt-1 text-[10px] font-bold text-primary/60">Learner Login Code</div></div>
                                    </div>

                                    <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
                                        <div className="space-y-6">
                                            <div className="space-y-4 rounded-2xl border-2 p-5">
                                                <div className="flex items-center justify-between"><h3 className="text-lg font-black">Edit Student Details</h3><Badge variant="secondary">{selectedSubjectIds.length} selected subjects</Badge></div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="grid gap-2"><Label>First Name</Label><Input value={studentForm.firstName} onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })} /></div>
                                                    <div className="grid gap-2"><Label>Last Name</Label><Input value={studentForm.lastName} onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })} /></div>
                                                    <div className="grid gap-2 md:col-span-2"><Label>Email</Label><Input value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} /></div>
                                                    <div className="grid gap-2"><Label>Administration Number</Label><Input value={studentForm.administrationNumber} onChange={(e) => setStudentForm({ ...studentForm, administrationNumber: e.target.value })} /></div>
                                                    <div className="grid gap-2"><Label>Admission Year</Label><Input value={studentForm.admissionYear} onChange={(e) => setStudentForm({ ...studentForm, admissionYear: e.target.value })} /></div>
                                                    <div className="grid gap-2"><Label>Gender</Label><Select value={studentForm.gender} onValueChange={(value) => setStudentForm({ ...studentForm, gender: value })}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
                                                    <div className="grid gap-2"><Label>Status</Label><Select value={studentForm.status} onValueChange={(value: Student["status"]) => setStudentForm({ ...studentForm, status: value })}><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="transferred">Transferred</SelectItem></SelectContent></Select></div>
                                                    <div className="grid gap-2"><Label>Grade</Label><Select value={studentForm.gradeId} onValueChange={(value) => setStudentForm({ ...studentForm, gradeId: value, registerClassId: "" })}><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger><SelectContent>{grades.map(gradeItem => <SelectItem key={gradeItem.id} value={gradeItem.id}>{gradeItem.name}</SelectItem>)}</SelectContent></Select></div>
                                                    <div className="grid gap-2"><Label>Register Class</Label><Select value={studentForm.registerClassId} onValueChange={(value) => setStudentForm({ ...studentForm, registerClassId: value })}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{availableRegisterClasses.map(registerClass => <SelectItem key={registerClass.id} value={registerClass.id}>{registerClass.name}</SelectItem>)}</SelectContent></Select></div>
                                                    <div className="grid gap-2 md:col-span-2"><Label>Security PIN</Label><Input value={studentForm.pin} onChange={(e) => setStudentForm({ ...studentForm, pin: e.target.value })} /></div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 rounded-2xl border-2 p-5">
                                                <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-black"><BookOpen className="h-5 w-5 text-primary" />Manage Subjects</h3><Badge variant="secondary" className="font-black">{selectedSubjectIds.length} Items</Badge></div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {availableSubjects.map(subject => {
                                                        const selected = selectedSubjectIds.includes(subject.id);
                                                        return (
                                                            <button key={subject.id} type="button" onClick={() => toggleSubject(subject.id)} className={cn("rounded-xl border-2 p-4 text-left transition-all", selected ? "border-primary bg-primary/5" : "hover:border-primary/30")}>
                                                                <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-bold">{subject.name}</div><div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Grade {subject.gradeTier}</div></div><Badge variant={selected ? "default" : "outline"}>{selected ? "Selected" : "Add"}</Badge></div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {availableSubjects.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No subjects are available for the selected grade yet.</div>}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-4 rounded-2xl border-2 p-5">
                                                <h3 className="text-lg font-black">Current Registered Subjects</h3>
                                                <div className="grid gap-3">
                                                    {currentSubjects.map(subjectAssignment => {
                                                        const subjectId = subjectAssignment.subjectId || subjectAssignment.subject_id;
                                                        const displayName = subjectAssignment.subject_name || subjects.find(subject => subject.id === subjectId)?.name || "Unknown";
                                                        return <div key={subjectAssignment.id || `${selectedStudent.id}-${subjectId}`} className="flex items-center rounded-xl border-2 p-4"><div className="mr-3 h-2 w-2 rounded-full bg-primary" /><span className="text-sm font-bold">{displayName}</span></div>;
                                                    })}
                                                </div>
                                            </div>

                                            <Separator className="h-[2px]" />

                                            <div className="space-y-4 rounded-2xl border-2 p-5">
                                                <h3 className="flex items-center gap-2 text-lg font-black"><School className="h-5 w-5 text-primary" />Teaching Group Placements</h3>
                                                <div className="grid gap-3">
                                                    {currentPlacements.map(placement => {
                                                        const subjectClass = subjectClasses.find(item => item.id === placement.subjectClassId);
                                                        const subject = subjects.find(item => item.id === subjectClass?.subjectId);
                                                        const teacher = teachers.find(item => item.id === subjectClass?.teacherId);
                                                        return <div key={placement.id} className="rounded-xl border-2 border-primary/10 bg-primary/5 p-4 shadow-sm"><div className="text-base font-black">{subjectClass?.name || "Unknown"}</div><div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{subject?.name}</div><div className="mt-2 text-xs font-bold text-primary">Prof. {teacher?.name || "TBA"}</div></div>;
                                                    })}
                                                    {currentPlacements.length === 0 && <div className="rounded-2xl border-2 border-dashed bg-muted/20 py-12 text-center"><Users className="mx-auto mb-2 h-8 w-8 opacity-20" /><p className="text-sm font-bold text-muted-foreground">No subject class enrollments found.</p></div>}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 rounded-2xl border-2 p-5">
                                                <Button onClick={handleSave} disabled={isSaving}><Save className="mr-2 h-4 w-4" />Save Student Changes</Button>
                                                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleDelete(selectedStudent.id, selectedStudent.name)}><Trash2 className="mr-2 h-4 w-4" />Delete Student</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}

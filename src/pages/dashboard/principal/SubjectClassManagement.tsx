import { useMemo, useState } from "react";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, BookOpen, Trash2, Eye, UserPlus, X, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SubjectClassForm = {
    name: string;
    subjectId: string;
    teacherId: string;
    capacity: number;
    gradeId: string;
};

const EMPTY_FORM: SubjectClassForm = {
    name: "",
    subjectId: "",
    teacherId: "",
    capacity: 35,
    gradeId: "",
};

export default function SubjectClassManagement() {
    const {
        grades,
        subjectClasses,
        students,
        addSubjectClass,
        updateSubjectClass,
        deleteSubjectClass,
        getSubjectClassStudents,
        getSubjectClassEnrollment,
        manualAssignSubjectClass,
        removeStudentFromSubjectClass,
        loading: registrationLoading,
    } = useRegistrationData();
    const { subjects, loading: subjectsLoading } = useSubjects();
    const { teachers, loading: schoolLoading } = useSchoolData();

    const isLoading = registrationLoading || subjectsLoading || schoolLoading;
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [addStudentId, setAddStudentId] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filterGrade, setFilterGrade] = useState("all");
    const [filterSubject, setFilterSubject] = useState("all");
    const [form, setForm] = useState<SubjectClassForm>(EMPTY_FORM);
    const [detailForm, setDetailForm] = useState<SubjectClassForm>(EMPTY_FORM);

    const selectedClass = subjectClasses.find(sc => sc.id === selectedClassId) || null;

    const resetForm = () => setForm(EMPTY_FORM);

    const getGradeLevel = (gradeId: string) => {
        const grade = grades.find(g => g.id === gradeId);
        const legacySortOrder = (grade as { sort_order?: number } | undefined)?.sort_order;
        return grade?.level ?? legacySortOrder ?? parseInt(String(grade?.name || "").replace(/\D/g, ""), 10);
    };

    const autoName = (currentForm: SubjectClassForm) => {
        const subject = subjects.find(s => s.id === currentForm.subjectId);
        const level = getGradeLevel(currentForm.gradeId);
        if (!subject || !level) return "";
        const existingCount = subjectClasses.filter(sc => sc.subjectId === currentForm.subjectId && sc.gradeId === currentForm.gradeId && sc.id !== selectedClassId).length;
        const letter = String.fromCharCode(65 + existingCount);
        return `${subject.name.substring(0, 3).toUpperCase()}${level}-${letter}`;
    };

    const subjectsForGrade = useMemo(() => {
        const level = getGradeLevel(form.gradeId);
        if (!level) return subjects;
        return subjects.filter(s => s.gradeTier === String(level));
    }, [form.gradeId, subjects]);

    const detailSubjectsForGrade = useMemo(() => {
        const level = getGradeLevel(detailForm.gradeId);
        if (!level) return subjects;
        return subjects.filter(s => s.gradeTier === String(level));
    }, [detailForm.gradeId, subjects]);

    const openDetails = (classId: string) => {
        const subjectClass = subjectClasses.find(sc => sc.id === classId);
        if (!subjectClass) return;

        setSelectedClassId(classId);
        setDetailForm({
            name: subjectClass.name,
            subjectId: subjectClass.subjectId,
            teacherId: subjectClass.teacherId || "",
            capacity: subjectClass.capacity,
            gradeId: subjectClass.gradeId,
        });
        setIsDetailOpen(true);
    };

    const handleCreate = async () => {
        if (!form.subjectId || !form.gradeId) {
            toast.error("Please select subject and grade");
            return;
        }

        const name = form.name || autoName(form);
        if (!name) {
            toast.error("Could not generate class name");
            return;
        }

        try {
            await addSubjectClass({ ...form, name });
            toast.success(`Subject class "${name}" created`);
            resetForm();
            setIsCreateOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to create subject class");
        }
    };

    const handleUpdate = async () => {
        if (!selectedClass) return;
        if (!detailForm.subjectId || !detailForm.gradeId) {
            toast.error("Please complete the class details");
            return;
        }

        const currentEnrollment = getSubjectClassEnrollment(selectedClass.id);
        if (detailForm.capacity < currentEnrollment) {
            toast.error(`Capacity cannot be less than the ${currentEnrollment} enrolled students`);
            return;
        }

        const name = detailForm.name || autoName(detailForm);
        setIsSaving(true);
        try {
            await updateSubjectClass(selectedClass.id, { ...detailForm, name });
            setDetailForm(prev => ({ ...prev, name }));
            toast.success(`"${name}" updated`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update subject class");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const enrolled = getSubjectClassEnrollment(id);
        if (enrolled > 0) {
            toast.error(`Cannot delete "${name}" while ${enrolled} students are enrolled`);
            return;
        }

        try {
            await deleteSubjectClass(id);
            toast.success(`"${name}" deleted`);
            if (selectedClassId === id) {
                setIsDetailOpen(false);
                setSelectedClassId(null);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete subject class");
        }
    };

    const filtered = subjectClasses.filter(sc => {
        const matchGrade = filterGrade === "all" || sc.gradeId === filterGrade;
        const matchSubject = filterSubject === "all" || sc.subjectId === filterSubject;
        return matchGrade && matchSubject;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Subject Classes</h1>
                    <p className="text-muted-foreground">Manage teaching groups where subjects are taught.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="font-bold"><Plus className="mr-2 h-4 w-4" />Create Subject Class</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader><DialogTitle className="text-2xl font-bold">New Subject Class</DialogTitle></DialogHeader>
                        <div className="grid gap-5 py-4">
                            <div className="grid gap-2">
                                <Label>Grade *</Label>
                                <Select value={form.gradeId} onValueChange={(value) => setForm({ ...form, gradeId: value, subjectId: "" })} disabled={isLoading}>
                                    <SelectTrigger><SelectValue placeholder={isLoading ? "Loading..." : "Select grade"} /></SelectTrigger>
                                    <SelectContent>
                                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Subject *</Label>
                                <Select value={form.subjectId} onValueChange={(value) => setForm({ ...form, subjectId: value })} disabled={isLoading}>
                                    <SelectTrigger><SelectValue placeholder={isLoading ? "Loading..." : subjectsForGrade.length === 0 ? "Select grade first" : "Select subject"} /></SelectTrigger>
                                    <SelectContent>
                                        {subjectsForGrade.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (G{s.gradeTier})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Class Name</Label>
                                <Input placeholder={autoName(form) || "e.g. PHY10-A (auto-generated if empty)"}
                                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                <p className="text-[10px] text-muted-foreground">Leave empty to auto-generate from subject and grade.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label>Teacher</Label>
                                <Select value={form.teacherId || "unassigned"} onValueChange={(value) => setForm({ ...form, teacherId: value === "unassigned" ? "" : value })} disabled={isLoading}>
                                    <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Capacity</Label>
                                <Input type="number" min={1} value={form.capacity}
                                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value, 10) || 1 })} />
                            </div>
                            <Button className="w-full font-bold" onClick={handleCreate}>Create Subject Class</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-4">
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (G{s.gradeTier})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Class</TableHead>
                            <TableHead className="font-bold">Subject</TableHead>
                            <TableHead className="font-bold">Grade</TableHead>
                            <TableHead className="font-bold">Teacher</TableHead>
                            <TableHead className="font-bold">Enrollment</TableHead>
                            <TableHead className="text-right font-bold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map(sc => {
                            const subject = subjects.find(s => s.id === sc.subjectId);
                            const grade = grades.find(g => g.id === sc.gradeId);
                            const teacher = teachers.find(t => t.id === sc.teacherId);
                            const enrolled = getSubjectClassEnrollment(sc.id);
                            return (
                                <TableRow key={sc.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                                                <BookOpen className="h-4 w-4 text-purple-600" />
                                            </div>
                                            <span className="font-bold">{sc.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{subject?.name || "-"}</Badge></TableCell>
                                    <TableCell><Badge variant="secondary">{grade?.name || "-"}</Badge></TableCell>
                                    <TableCell>{teacher?.name || <span className="text-sm italic text-muted-foreground">Unassigned</span>}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 max-w-[100px] flex-1 overflow-hidden rounded-full bg-muted">
                                                <div className={cn(
                                                    "h-full rounded-full transition-all",
                                                    enrolled / sc.capacity > 0.9 ? "bg-red-500" : enrolled / sc.capacity > 0.7 ? "bg-orange-500" : "bg-green-500"
                                                )} style={{ width: `${Math.min((enrolled / sc.capacity) * 100, 100)}%` }} />
                                            </div>
                                            <span className="text-sm font-mono">{enrolled}/{sc.capacity}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openDetails(sc.id)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => handleDelete(sc.id, sc.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No subject classes found. Create your first teaching group.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) { setAddStudentId(""); setSelectedClassId(null); } }}>
                <DialogContent className="sm:max-w-[620px]">
                    {selectedClass && (() => {
                        const subject = subjects.find(s => s.id === detailForm.subjectId);
                        const grade = grades.find(g => g.id === detailForm.gradeId);
                        const teacher = teachers.find(t => t.id === detailForm.teacherId);
                        const classStudents = getSubjectClassStudents(selectedClass.id);
                        const enrolledIds = classStudents.map(student => student.id);
                        const isFull = classStudents.length >= detailForm.capacity;
                        const studentsToAdd = students.filter(student => student.gradeId === detailForm.gradeId && !enrolledIds.includes(student.id));

                        const handleAddStudent = async () => {
                            if (!addStudentId) return;
                            setIsAdding(true);
                            try {
                                await manualAssignSubjectClass(addStudentId, selectedClass.id);
                                toast.success("Student added to class");
                                setAddStudentId("");
                            } catch {
                                toast.error("Failed to add student");
                            } finally {
                                setIsAdding(false);
                            }
                        };

                        const handleRemoveStudent = async (studentId: string) => {
                            try {
                                await removeStudentFromSubjectClass(studentId, selectedClass.id);
                                toast.success("Student removed from class");
                            } catch {
                                toast.error("Failed to remove student");
                            }
                        };

                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black">{detailForm.name || selectedClass.name}</DialogTitle>
                                    <p className="text-muted-foreground">{subject?.name} · {grade?.name} · {teacher?.name || "No teacher"}</p>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="grid gap-4 rounded-xl border p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold">Class Configuration</span>
                                            <Badge>{classStudents.length}/{detailForm.capacity}</Badge>
                                        </div>
                                        <div className="grid gap-3">
                                            <div className="grid gap-2">
                                                <Label>Class Name</Label>
                                                <Input value={detailForm.name} onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Grade</Label>
                                                <Select value={detailForm.gradeId} onValueChange={(value) => setDetailForm({ ...detailForm, gradeId: value, subjectId: "" })}>
                                                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                                                    <SelectContent>
                                                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Subject</Label>
                                                <Select value={detailForm.subjectId} onValueChange={(value) => setDetailForm({ ...detailForm, subjectId: value })}>
                                                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                                                    <SelectContent>
                                                        {detailSubjectsForGrade.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (G{s.gradeTier})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Teacher</Label>
                                                <Select value={detailForm.teacherId || "unassigned"} onValueChange={(value) => setDetailForm({ ...detailForm, teacherId: value === "unassigned" ? "" : value })}>
                                                    <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Capacity</Label>
                                                <Input type="number" min={1} value={detailForm.capacity}
                                                    onChange={(e) => setDetailForm({ ...detailForm, capacity: parseInt(e.target.value, 10) || 1 })} />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={handleUpdate} disabled={isSaving}>
                                                <PencilLine className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </Button>
                                            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(selectedClass.id, selectedClass.name)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Class
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">Enrolled Students</span>
                                        <Badge>{classStudents.length}/{detailForm.capacity}</Badge>
                                    </div>
                                    {!isFull && studentsToAdd.length > 0 && (
                                        <div className="flex gap-2">
                                            <Select value={addStudentId} onValueChange={setAddStudentId}>
                                                <SelectTrigger className="flex-1"><SelectValue placeholder="Add learner to class" /></SelectTrigger>
                                                <SelectContent>
                                                    {studentsToAdd.map(student => <SelectItem key={student.id} value={student.id}>{student.name} ({student.administrationNumber})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Button size="sm" onClick={handleAddStudent} disabled={!addStudentId || isAdding}>
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="max-h-[300px] space-y-2 overflow-y-auto">
                                        {classStudents.map(student => (
                                            <div key={student.id} className="group flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-bold">{student.name}</div>
                                                    <div className="text-[10px] font-mono text-muted-foreground">{student.administrationNumber}</div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-50"
                                                    onClick={() => handleRemoveStudent(student.id)} title="Remove from class">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {classStudents.length === 0 && (
                                            <p className="py-8 text-center text-sm text-muted-foreground">No students enrolled yet. Add learners above.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}

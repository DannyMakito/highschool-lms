import { useState } from "react";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, BookOpen, Trash2, Users, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SubjectClassManagement() {
    const {
        grades, subjectClasses, addSubjectClass, deleteSubjectClass,
        getSubjectClassStudents, getSubjectClassEnrollment,
        loading: registrationLoading,
    } = useRegistrationData();
    const { subjects, loading: subjectsLoading } = useSubjects();
    const { teachers, loading: schoolLoading } = useSchoolData();

    const isLoading = registrationLoading || subjectsLoading || schoolLoading;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [filterGrade, setFilterGrade] = useState("all");
    const [filterSubject, setFilterSubject] = useState("all");

    const [form, setForm] = useState({
        name: "",
        subjectId: "",
        teacherId: "",
        capacity: 35,
        gradeId: "",
    });

    const resetForm = () => setForm({ name: "", subjectId: "", teacherId: "", capacity: 35, gradeId: "" });

    // Auto-generate name
    const autoName = () => {
        const subject = subjects.find(s => s.id === form.subjectId);
        const grade = grades.find(g => g.id === form.gradeId);
        if (subject && grade) {
            const prefix = subject.name.substring(0, 3).toUpperCase();
            const level = grade.level ?? grade.sort_order ?? parseInt(String(grade.name || '').replace(/\D/g, ''), 10) || 0;
            const existingCount = subjectClasses.filter(sc => sc.subjectId === form.subjectId && sc.gradeId === form.gradeId).length;
            const letter = String.fromCharCode(65 + existingCount); // A, B, C...
            return `${prefix}${level}-${letter}`;
        }
        return "";
    };

    // Filtered subjects for the selected grade (matches grade level/tier)
    const subjectsForGrade = subjects.filter(s => {
        if (!form.gradeId) return true;
        const grade = grades.find(g => g.id === form.gradeId);
        const level = grade?.level ?? grade?.sort_order ?? parseInt(String(grade?.name || '').replace(/\D/g, ''), 10);
        return s.gradeTier === String(level);
    });

    const handleCreate = () => {
        if (!form.subjectId || !form.gradeId) {
            toast.error("Please select subject and grade");
            return;
        }
        const name = form.name || autoName();
        if (!name) { toast.error("Could not generate class name"); return; }

        addSubjectClass({ ...form, name });
        toast.success(`Subject class "${name}" created`);
        resetForm();
        setIsCreateOpen(false);
    };

    const handleDelete = (id: string, name: string) => {
        const enrolled = getSubjectClassEnrollment(id);
        if (enrolled > 0) {
            toast.error(`Cannot delete "${name}" — ${enrolled} students enrolled`);
            return;
        }
        deleteSubjectClass(id);
        toast.success(`"${name}" deleted`);
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
                                <Select value={form.gradeId} onValueChange={(v) => setForm({ ...form, gradeId: v, subjectId: "" })} disabled={isLoading}>
                                    <SelectTrigger><SelectValue placeholder={isLoading ? "Loading..." : grades.length === 0 ? "No grades — run seed" : "Select grade"} /></SelectTrigger>
                                    <SelectContent>
                                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Subject *</Label>
                                <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })} disabled={isLoading}>
                                    <SelectTrigger><SelectValue placeholder={isLoading ? "Loading..." : subjectsForGrade.length === 0 ? "Select grade first or no subjects" : "Select subject"} /></SelectTrigger>
                                    <SelectContent>
                                        {subjectsForGrade.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (G{s.gradeTier})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Class Name</Label>
                                <Input placeholder={autoName() || "e.g. PHY10-A (auto-generated if empty)"}
                                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                <p className="text-[10px] text-muted-foreground">Leave empty to auto-generate from subject+grade.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label>Teacher</Label>
                                <Select value={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })} disabled={isLoading}>
                                    <SelectTrigger><SelectValue placeholder={isLoading ? "Loading..." : teachers.length === 0 ? "No teachers yet" : "Assign teacher"} /></SelectTrigger>
                                    <SelectContent>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Capacity</Label>
                                <Input type="number" value={form.capacity}
                                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 35 })} />
                            </div>
                            <Button className="w-full font-bold" onClick={handleCreate}>Create Subject Class</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
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

            {/* Table */}
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
                                            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                <BookOpen className="h-4 w-4 text-purple-600" />
                                            </div>
                                            <span className="font-bold">{sc.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{subject?.name || "—"}</Badge></TableCell>
                                    <TableCell><Badge variant="secondary">{grade?.name || "—"}</Badge></TableCell>
                                    <TableCell>{teacher?.name || <span className="text-muted-foreground italic text-sm">Unassigned</span>}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                                                <div className={cn("h-full rounded-full transition-all",
                                                    enrolled / sc.capacity > 0.9 ? "bg-red-500" : enrolled / sc.capacity > 0.7 ? "bg-orange-500" : "bg-green-500"
                                                )} style={{ width: `${Math.min((enrolled / sc.capacity) * 100, 100)}%` }} />
                                            </div>
                                            <span className="text-sm font-mono">{enrolled}/{sc.capacity}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedClass(sc); setIsDetailOpen(true); }}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50"
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

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    {selectedClass && (() => {
                        const subject = subjects.find(s => s.id === selectedClass.subjectId);
                        const grade = grades.find(g => g.id === selectedClass.gradeId);
                        const teacher = teachers.find(t => t.id === selectedClass.teacherId);
                        const classStudents = getSubjectClassStudents(selectedClass.id);
                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black">{selectedClass.name}</DialogTitle>
                                    <p className="text-muted-foreground">{subject?.name} · {grade?.name} · {teacher?.name || "No teacher"}</p>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">Enrolled Students</span>
                                        <Badge>{classStudents.length}/{selectedClass.capacity}</Badge>
                                    </div>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {classStudents.map(s => (
                                            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {s.firstName?.charAt(0)}{s.lastName?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm">{s.name}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">{s.administrationNumber}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {classStudents.length === 0 && (
                                            <p className="text-center text-sm text-muted-foreground py-8">No students enrolled yet.</p>
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

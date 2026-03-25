import { useState } from "react";
import { useRegistrationData } from "@/hooks/useRegistrationData";
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
import { Plus, School, Trash2, Eye, PencilLine } from "lucide-react";
import { toast } from "sonner";

type ClassForm = {
    name: string;
    gradeId: string;
    classTeacherId: string;
    maxStudents: number;
};

const EMPTY_FORM: ClassForm = {
    name: "",
    gradeId: "",
    classTeacherId: "",
    maxStudents: 40,
};

export default function RegisterClassManagement() {
    const {
        grades,
        registerClasses,
        addRegisterClass,
        updateRegisterClass,
        deleteRegisterClass,
        getRegisterClassStudents,
    } = useRegistrationData();
    const { teachers } = useSchoolData();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [form, setForm] = useState<ClassForm>(EMPTY_FORM);
    const [detailForm, setDetailForm] = useState<ClassForm>(EMPTY_FORM);

    const selectedClass = registerClasses.find(rc => rc.id === selectedClassId) || null;

    const resetForm = () => setForm(EMPTY_FORM);

    const openDetails = (classId: string) => {
        const registerClass = registerClasses.find(rc => rc.id === classId);
        if (!registerClass) return;

        setSelectedClassId(classId);
        setDetailForm({
            name: registerClass.name,
            gradeId: registerClass.gradeId,
            classTeacherId: registerClass.classTeacherId || "",
            maxStudents: registerClass.maxStudents,
        });
        setIsDetailOpen(true);
    };

    const handleCreate = async () => {
        if (!form.name || !form.gradeId) {
            toast.error("Please fill in class name and grade");
            return;
        }

        try {
            await addRegisterClass(form);
            toast.success(`Register class "${form.name}" created`);
            resetForm();
            setIsCreateOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to create register class");
        }
    };

    const handleUpdate = async () => {
        if (!selectedClass) return;
        if (!detailForm.name || !detailForm.gradeId) {
            toast.error("Please fill in class name and grade");
            return;
        }

        const studentCount = getRegisterClassStudents(selectedClass.id).length;
        if (detailForm.maxStudents < studentCount) {
            toast.error(`Capacity cannot be less than the ${studentCount} assigned students`);
            return;
        }

        setIsSaving(true);
        try {
            await updateRegisterClass(selectedClass.id, detailForm);
            toast.success(`"${detailForm.name}" updated`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update register class");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const studentCount = getRegisterClassStudents(id).length;
        if (studentCount > 0) {
            toast.error(`Cannot delete "${name}" while ${studentCount} students are assigned`);
            return;
        }

        try {
            await deleteRegisterClass(id);
            toast.success(`"${name}" deleted`);
            if (selectedClassId === id) {
                setIsDetailOpen(false);
                setSelectedClassId(null);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete register class");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Register Classes</h1>
                    <p className="text-muted-foreground">Manage homeroom classes for administrative grouping and attendance.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="font-bold"><Plus className="mr-2 h-4 w-4" />Create Register Class</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader><DialogTitle className="text-2xl font-bold">New Register Class</DialogTitle></DialogHeader>
                        <div className="grid gap-5 py-4">
                            <div className="grid gap-2">
                                <Label>Class Name *</Label>
                                <Input placeholder="e.g. 10A" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Grade *</Label>
                                <Select value={form.gradeId} onValueChange={(value) => setForm({ ...form, gradeId: value })}>
                                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                                    <SelectContent>
                                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Class Teacher</Label>
                                <Select value={form.classTeacherId || "unassigned"} onValueChange={(value) => setForm({ ...form, classTeacherId: value === "unassigned" ? "" : value })}>
                                    <SelectTrigger><SelectValue placeholder="Assign teacher (optional)" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Max Students</Label>
                                <Input type="number" min={1} value={form.maxStudents}
                                    onChange={(e) => setForm({ ...form, maxStudents: parseInt(e.target.value, 10) || 1 })} />
                            </div>
                            <Button className="w-full font-bold" onClick={handleCreate}>Create Class</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {grades.map(g => {
                    const count = registerClasses.filter(rc => rc.gradeId === g.id).length;
                    return (
                        <Card key={g.id}><CardContent className="p-4 text-center">
                            <div className="text-2xl font-black">{count}</div>
                            <div className="text-xs text-muted-foreground">{g.name} Classes</div>
                        </CardContent></Card>
                    );
                })}
            </div>

            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Class Name</TableHead>
                            <TableHead className="font-bold">Grade</TableHead>
                            <TableHead className="font-bold">Class Teacher</TableHead>
                            <TableHead className="font-bold">Enrollment</TableHead>
                            <TableHead className="text-right font-bold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {registerClasses.map(rc => {
                            const grade = grades.find(g => g.id === rc.gradeId);
                            const teacher = teachers.find(t => t.id === rc.classTeacherId);
                            const enrolled = getRegisterClassStudents(rc.id).length;
                            return (
                                <TableRow key={rc.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                                                <School className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <span className="font-bold">{rc.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{grade?.name}</Badge></TableCell>
                                    <TableCell>{teacher?.name || <span className="text-sm italic text-muted-foreground">Unassigned</span>}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 max-w-[100px] flex-1 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full rounded-full bg-primary transition-all"
                                                    style={{ width: `${Math.min((enrolled / rc.maxStudents) * 100, 100)}%` }} />
                                            </div>
                                            <span className="text-sm font-mono">{enrolled}/{rc.maxStudents}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openDetails(rc.id)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => handleDelete(rc.id, rc.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {registerClasses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No register classes yet. Create your first homeroom class.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setSelectedClassId(null); }}>
                <DialogContent className="sm:max-w-[760px]">
                    {selectedClass && (() => {
                        const grade = grades.find(g => g.id === selectedClass.gradeId);
                        const teacher = teachers.find(t => t.id === selectedClass.classTeacherId);
                        const students = getRegisterClassStudents(selectedClass.id);

                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                                        <School className="h-6 w-6 text-primary" />
                                        {selectedClass.name}
                                    </DialogTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {grade?.name || "No grade"} homeroom with {students.length} learner(s).
                                    </p>
                                </DialogHeader>

                                <div className="grid gap-6 py-4 md:grid-cols-[1.05fr,0.95fr]">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-black">Class Details</h3>
                                            <Badge variant="secondary">{students.length}/{detailForm.maxStudents}</Badge>
                                        </div>
                                        <div className="grid gap-4">
                                            <div className="grid gap-2">
                                                <Label>Class Name</Label>
                                                <Input value={detailForm.name} onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Grade</Label>
                                                <Select value={detailForm.gradeId} onValueChange={(value) => setDetailForm({ ...detailForm, gradeId: value })}>
                                                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                                                    <SelectContent>
                                                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Class Teacher</Label>
                                                <Select value={detailForm.classTeacherId || "unassigned"} onValueChange={(value) => setDetailForm({ ...detailForm, classTeacherId: value === "unassigned" ? "" : value })}>
                                                    <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Maximum Learners</Label>
                                                <Input type="number" min={1} value={detailForm.maxStudents}
                                                    onChange={(e) => setDetailForm({ ...detailForm, maxStudents: parseInt(e.target.value, 10) || 1 })} />
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
                                        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                                            <div className="font-bold">Assigned teacher</div>
                                            <div className="text-muted-foreground">{teacher?.name || "No teacher assigned yet"}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-black">Enrolled Learners</h3>
                                        <div className="max-h-[430px] space-y-2 overflow-y-auto rounded-xl border p-3">
                                            {students.map(student => (
                                                <div key={student.id} className="rounded-lg border bg-background p-3">
                                                    <div className="font-bold">{student.name}</div>
                                                    <div className="text-xs text-muted-foreground">{student.administrationNumber}</div>
                                                    <div className="text-xs text-muted-foreground">{student.email || "No email documented"}</div>
                                                </div>
                                            ))}
                                            {students.length === 0 && (
                                                <div className="py-12 text-center text-sm text-muted-foreground">
                                                    No learners are assigned to this register class yet.
                                                </div>
                                            )}
                                        </div>
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

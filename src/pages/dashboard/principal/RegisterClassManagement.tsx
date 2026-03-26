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
import { Plus, School, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterClassManagement() {
    const { grades, registerClasses, addRegisterClass, deleteRegisterClass, getRegisterClassStudents } = useRegistrationData();
    const { teachers } = useSchoolData();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [form, setForm] = useState({
        name: "",
        gradeId: "",
        classTeacherId: "",
        maxStudents: 40,
    });

    const resetForm = () => setForm({ name: "", gradeId: "", classTeacherId: "", maxStudents: 40 });

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
            console.error("Create RC Error:", error);
            toast.error(error.message || "Failed to create register class");
        }
    };

    const handleDelete = (id: string, name: string) => {
        const studentCount = getRegisterClassStudents(id).length;
        if (studentCount > 0) {
            toast.error(`Cannot delete "${name}" — ${studentCount} students assigned`);
            return;
        }
        deleteRegisterClass(id);
        toast.success(`"${name}" deleted`);
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
                                <Select value={form.gradeId} onValueChange={(v) => setForm({ ...form, gradeId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                                    <SelectContent>
                                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Class Teacher</Label>
                                <Select value={form.classTeacherId} onValueChange={(v) => setForm({ ...form, classTeacherId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Assign teacher (optional)" /></SelectTrigger>
                                    <SelectContent>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Max Students</Label>
                                <Input type="number" value={form.maxStudents}
                                    onChange={(e) => setForm({ ...form, maxStudents: parseInt(e.target.value) || 40 })} />
                            </div>
                            <Button className="w-full font-bold" onClick={handleCreate}>Create Class</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

            {/* Table */}
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
                                            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <School className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <span className="font-bold">{rc.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{grade?.name}</Badge></TableCell>
                                    <TableCell>{teacher?.name || <span className="text-muted-foreground italic text-sm">Unassigned</span>}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                                                <div className="h-full bg-primary rounded-full transition-all"
                                                    style={{ width: `${Math.min((enrolled / rc.maxStudents) * 100, 100)}%` }} />
                                            </div>
                                            <span className="text-sm font-mono">{enrolled}/{rc.maxStudents}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(rc.id, rc.name)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
        </div>
    );
}

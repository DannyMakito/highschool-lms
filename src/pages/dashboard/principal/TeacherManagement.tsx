
import { useState } from "react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useSubjects } from "@/hooks/useSubjects";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Users,
    Mail,
    BookOpen,
    Eye,
    ShieldCheck,
    UserPlus,
    School,
    GraduationCap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

export default function TeacherManagement() {
    const { teachers, classes, students, addTeacher, addSubjectToTeacher, removeSubjectFromTeacher } = useSchoolData();
    const { subjects } = useSubjects();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditingSubjects, setIsEditingSubjects] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const [newTeacher, setNewTeacher] = useState({
        name: "",
        email: "",
        gender: "",
        subjects: [] as string[],
        pin: "",
    });

    const handleCreate = async () => {
        if (!newTeacher.name || !newTeacher.email) {
            toast.error("Please fill in name and email");
            return;
        }
        if (!newTeacher.gender) {
            toast.error("Please select a gender");
            return;
        }
        if (newTeacher.pin.length !== 6) {
            toast.error("Password must be exactly 6 characters");
            return;
        }
        setIsCreating(true);
        try {
            await addTeacher(newTeacher);
            toast.success("Teacher profile created successfully");
            setIsCreateOpen(false);
            setNewTeacher({
                name: "",
                email: "",
                gender: "",
                subjects: [],
                pin: "",
            });
        } catch (error: any) {
            console.error("Teacher create error:", error);
            toast.error(error?.message || "Failed to create teacher profile");
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateSubjects = async (subjectId: string, add: boolean) => {
        if (!selectedTeacher) return;
        
        setIsUpdating(true);
        try {
            if (add) {
                await addSubjectToTeacher(selectedTeacher.id, subjectId);
                setSelectedTeacher(prev => ({
                    ...prev,
                    subjects: [...prev.subjects, subjectId]
                }));
                toast.success("Subject added successfully");
            } else {
                await removeSubjectFromTeacher(selectedTeacher.id, subjectId);
                setSelectedTeacher(prev => ({
                    ...prev,
                    subjects: prev.subjects.filter(s => s !== subjectId)
                }));
                toast.success("Subject removed successfully");
            }
        } catch (error: any) {
            console.error("Subject update error:", error);
            toast.error(error?.message || "Failed to update subjects");
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleSubject = (subjectId: string) => {
        setNewTeacher(prev => ({
            ...prev,
            subjects: prev.subjects.includes(subjectId)
                ? prev.subjects.filter(id => id !== subjectId)
                : [...prev.subjects, subjectId]
        }));
    };

    const getTeacherSchoolClasses = (teacherId: string) => {
        return classes.filter(c => c.teacherId === teacherId);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Staff Management</h1>
                    <p className="text-muted-foreground">Oversee teacher profiles, assigned subjects, and classroom activity.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 font-bold">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create Teacher Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">New Teacher Profile</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Sarah Jenkins"
                                    value={newTeacher.name}
                                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="s.jenkins@school.com"
                                    value={newTeacher.email}
                                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Gender</Label>
                                <div className="flex gap-3">
                                    {["Male", "Female"].map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setNewTeacher({ ...newTeacher, gender: g })}
                                            className={`flex-1 p-3 rounded-lg border-2 text-sm font-bold transition-all ${newTeacher.gender === g
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-muted hover:bg-muted/50"
                                                }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Assigned Subjects</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
                                    {subjects.map(s => (
                                        <div
                                            key={s.id}
                                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-colors ${newTeacher.subjects.includes(s.id)
                                                ? "bg-primary/10 border-primary text-primary"
                                                : "hover:bg-muted"
                                                }`}
                                            onClick={() => toggleSubject(s.id)}
                                        >
                                            <div className={`h-2 w-2 rounded-full ${newTeacher.subjects.includes(s.id) ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                            <span className="text-xs font-medium">{s.name} (G{s.gradeTier})</span>
                                        </div>
                                    ))}
                                    {subjects.length === 0 && (
                                        <p className="col-span-2 text-center text-xs text-muted-foreground py-4">No subjects found. Create subjects first.</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Login Password (6 characters)</Label>
                                <Input
                                    value={newTeacher.pin}
                                    maxLength={6}
                                    placeholder="Enter 6-character password"
                                    className="font-mono text-center text-lg tracking-[0.3em]"
                                    onChange={(e) => setNewTeacher({ ...newTeacher, pin: e.target.value })}
                                />
                                {newTeacher.pin.length > 0 && newTeacher.pin.length < 6 && (
                                    <p className="text-[10px] text-destructive font-bold">{6 - newTeacher.pin.length} more character(s) needed</p>
                                )}
                                {newTeacher.pin.length === 6 && (
                                    <p className="text-[10px] text-green-600 font-bold">✓ Password length valid</p>
                                )}
                                <p className="text-[10px] text-muted-foreground">This password will be used for the teacher's login.</p>
                            </div>
                        </div>
                        <Button className="w-full font-bold" onClick={handleCreate} disabled={isCreating}>
                            {isCreating ? "Creating..." : "Finalize Profile"}
                        </Button>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search teachers by name or email..."
                        className="pl-10 h-12 bg-card/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-muted/20 bg-card/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Teacher Name</TableHead>
                            <TableHead className="font-bold">Contact</TableHead>
                            <TableHead className="font-bold">Subjects</TableHead>
                            <TableHead className="font-bold">SchoolClasses</TableHead>
                            <TableHead className="text-right font-bold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTeachers.map((teacher) => {
                            const teacherSchoolClasses = getTeacherSchoolClasses(teacher.id);
                            return (
                                <TableRow key={teacher.id} className="hover:bg-muted/50 cursor-pointer group" onClick={() => {
                                    setSelectedTeacher(teacher);
                                    setIsDetailOpen(true);
                                }}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold">{teacher.name}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Teacher ID: {teacher.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                            {teacher.email}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {teacher.subjects.slice(0, 2).map(sid => {
                                                const s = subjects.find(sub => sub.id === sid);
                                                return <Badge key={sid} variant="outline" className="text-[10px]">{s?.name || sid}</Badge>
                                            })}
                                            {teacher.subjects.length > 2 && <Badge variant="secondary" className="text-[10px]">+{teacher.subjects.length - 2}</Badge>}
                                            {teacher.subjects.length === 0 && <span className="text-muted-foreground text-xs italic">No subjects</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono">{teacherSchoolClasses.length} Active</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="group-hover:text-primary">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredTeachers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No teachers found. Create a profile to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Teacher Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={(open) => {
                setIsDetailOpen(open);
                if (!open) {
                    setIsEditingSubjects(false);
                    // Sync teacher data when closing to get latest changes
                    if (selectedTeacher) {
                        const updatedTeacher = teachers.find(t => t.id === selectedTeacher.id);
                        if (updatedTeacher) {
                            setSelectedTeacher(updatedTeacher);
                        }
                    }
                }
            }}>
                <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    {selectedTeacher && (
                        <>
                            <div className="bg-primary p-8 text-primary-foreground flex-shrink-0">
                                <div className="flex items-center gap-6">
                                    <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black">
                                        {selectedTeacher.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black">{selectedTeacher.name}</h2>
                                        <p className="opacity-80 flex items-center gap-2"><Mail className="h-4 w-4" /> {selectedTeacher.email}</p>
                                    </div>
                                </div>
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md">
                                        <div className="text-xs uppercase font-black tracking-widest opacity-60 mb-1">Security PIN</div>
                                        <div className="text-2xl font-mono tracking-[0.35em]">{selectedTeacher.pin}</div>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md">
                                        <div className="text-xs uppercase font-black tracking-widest opacity-60 mb-1">Joined School</div>
                                        <div className="text-sm font-bold">{new Date(selectedTeacher.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            <div>
                                    <h3 className="font-bold flex items-center justify-between mb-4">
                                        <span className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            Assigned Curriculum
                                        </span>
                                        {isEditingSubjects && (
                                            <span className="text-xs text-muted-foreground">Click to select</span>
                                        )}
                                    </h3>

                                    {!isEditingSubjects ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedTeacher.subjects.map((sid: string) => {
                                                const s = subjects.find(sub => sub.id === sid);
                                                return (
                                                    <div key={sid} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                                                        <span className="font-medium text-sm">{s?.name || "Unknown"}</span>
                                                        <Badge variant="outline">Grade {s?.gradeTier || "?"}</Badge>
                                                    </div>
                                                );
                                            })}
                                            {selectedTeacher.subjects.length === 0 && <p className="text-sm text-muted-foreground italic">No subjects assigned yet.</p>}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2 p-2 border rounded-md bg-muted/10">
                                            {subjects.map(s => {
                                                const isAssigned = selectedTeacher.subjects.includes(s.id);
                                                return (
                                                    <div
                                                        key={s.id}
                                                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                                                            isAssigned
                                                                ? "bg-primary/10 border-primary"
                                                                : "border-muted hover:bg-muted/50"
                                                        }`}
                                                        onClick={() => handleUpdateSubjects(s.id, !isAssigned)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-2 w-2 rounded-full ${isAssigned ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                                            <span className="text-xs font-medium">{s.name} (G{s.gradeTier})</span>
                                                        </div>
                                                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center text-xs font-bold ${
                                                            isAssigned ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                                                        }`}>
                                                            {isAssigned && "✓"}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {subjects.length === 0 && (
                                                <p className="col-span-2 text-center text-xs text-muted-foreground py-4">No subjects available</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {!isEditingSubjects && (
                                    <div>
                                        <h3 className="font-bold flex items-center gap-2 mb-4">
                                            <School className="h-4 w-4 text-primary" />
                                            Managed Classes
                                        </h3>
                                        <div className="space-y-4">
                                            {getTeacherSchoolClasses(selectedTeacher.id).map(c => (
                                                <div key={c.id} className="p-4 rounded-xl border bg-card/50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <h4 className="font-bold">{c.name}</h4>
                                                            <p className="text-xs text-muted-foreground">Class ID: {c.id.slice(0, 8)}</p>
                                                        </div>
                                                        <Badge className="bg-green-500/10 text-green-600 border-green-200">{c.studentIds.length} Learners</Badge>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Class Roster</div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            {c.studentIds.map(sid => {
                                                                const student = students.find(st => st.id === sid);
                                                                return (
                                                                    <div key={sid} className="flex items-center gap-2 text-muted-foreground">
                                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                                        {student?.name || "Unknown Student"}
                                                                    </div>
                                                                );
                                                            })}
                                                            {c.studentIds.length === 0 && <p className="text-xs text-muted-foreground italic col-span-2">No students enrolled yet.</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {getTeacherSchoolClasses(selectedTeacher.id).length === 0 && (
                                                <div className="text-center py-8 rounded-xl border-2 border-dashed bg-muted/20">
                                                    <p className="text-sm text-muted-foreground">This teacher hasn't created any classes yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Footer */}
                            <div className="border-t bg-muted/30 p-4 flex-shrink-0 flex gap-3 justify-end">
                                <Button 
                                    variant="outline"
                                    onClick={() => setIsDetailOpen(false)}
                                >
                                    Close
                                </Button>
                                {isEditingSubjects && (
                                    <Button 
                                        onClick={() => setIsEditingSubjects(false)}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? "Saving..." : "Done"}
                                    </Button>
                                )}
                                {!isEditingSubjects && (
                                    <Button 
                                        variant="outline"
                                        onClick={() => setIsEditingSubjects(true)}
                                    >
                                        Edit Subjects
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

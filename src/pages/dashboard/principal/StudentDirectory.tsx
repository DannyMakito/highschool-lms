import { useState } from "react";
import type { Student } from "@/types";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, Users, BookOpen, School, Filter, UserCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function StudentDirectory() {
    const {
        grades, registerClasses, subjectClasses,
        students, deleteStudent, getStudentSubjects,
        getStudentSubjectClasses,
    } = useRegistrationData();
    const { subjects } = useSubjects();
    const { teachers } = useSchoolData();

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterGrade, setFilterGrade] = useState("all");
    const [filterClass, setFilterClass] = useState("all");

    // Filtering
    const filteredStudents = students.filter(s => {
        const matchesSearch = (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.administrationNumber || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade = filterGrade === "all" || s.gradeId === filterGrade;
        const matchesClass = filterClass === "all" || s.registerClassId === filterClass;
        return matchesSearch && matchesGrade && matchesClass;
    });

    const openProfile = (student: Student) => {
        setSelectedStudent(student);
        setIsProfileOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}? This will remove all their enrollments.`)) {
            deleteStudent(id);
            toast.success(`Student ${name} removed`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Student Directory</h1>
                    <p className="text-muted-foreground">Manage and view all registered learners in the system.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="font-bold border-2">
                        Export List
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-2"><CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div>
                    <div><div className="text-2xl font-black">{students.length}</div><div className="text-xs text-muted-foreground">Total Students</div></div>
                </CardContent></Card>
                <Card className="border-2"><CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center"><UserCheck className="h-6 w-6 text-green-600" /></div>
                    <div><div className="text-2xl font-black">{students.filter(s => s.status === 'active').length}</div><div className="text-xs text-muted-foreground">Active Units</div></div>
                </CardContent></Card>
                <Card className="border-2"><CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center"><School className="h-6 w-6 text-blue-600" /></div>
                    <div><div className="text-2xl font-black">{registerClasses.length}</div><div className="text-xs text-muted-foreground">Reg Classes</div></div>
                </CardContent></Card>
                <Card className="border-2"><CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center"><BookOpen className="h-6 w-6 text-purple-600" /></div>
                    <div><div className="text-2xl font-black">{subjectClasses.length}</div><div className="text-xs text-muted-foreground">Sub Classes</div></div>
                </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-muted/30 p-4 rounded-xl border-2">
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search students..." className="pl-10 h-11 border-2"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="w-[160px] h-11 border-2"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="w-[180px] h-11 border-2"><SelectValue placeholder="Register Class" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {registerClasses.map(rc => <SelectItem key={rc.id} value={rc.id}>{rc.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Student Table */}
            <Card className="overflow-hidden border-2">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-black text-xs uppercase tracking-wider">Student Profile</TableHead>
                            <TableHead className="font-black text-xs uppercase tracking-wider">Admission</TableHead>
                            <TableHead className="font-black text-xs uppercase tracking-wider">Academics</TableHead>
                            <TableHead className="font-black text-xs uppercase tracking-wider">Subjects</TableHead>
                            <TableHead className="font-black text-xs uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-right font-black text-xs uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map(student => {
                            const grade = grades.find(g => g.id === student.gradeId);
                            const regClass = registerClasses.find(rc => rc.id === student.registerClassId);
                            const subjectCount = student.subjects?.length ?? getStudentSubjects(student.id).length;
                            return (
                                <TableRow key={student.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-sm group-hover:scale-105 transition-transform">
                                                {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-black">{student.name}</div>
                                                <div className="text-[10px] text-muted-foreground font-bold">{student.gender} • {student.admissionYear}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-bold">{student.administrationNumber}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Badge variant="outline" className="text-[10px] font-black">{grade?.name}</Badge>
                                            <div className="text-[10px] text-muted-foreground font-bold">{regClass?.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-[10px] font-black">
                                            {subjectCount} Subjects
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "capitalize text-[10px] font-black px-2 py-0 border-2",
                                            student.status === "active" ? "text-green-600 bg-green-50 border-green-200" :
                                                student.status === "transferred" ? "text-orange-600 bg-orange-50 border-orange-200" :
                                                    "text-red-600 bg-red-50 border-red-200"
                                        )}>
                                            {student.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary" onClick={() => openProfile(student)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(student.id, student.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredStudents.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Users className="h-8 w-8 opacity-20" />
                                        <p className="font-bold">No students found matching your criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Profile Dialog */}
            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0 border-2 rounded-2xl">
                    {selectedStudent && (() => {
                        const grade = grades.find(g => g.id === selectedStudent.gradeId);
                        const regClass = registerClasses.find(rc => rc.id === selectedStudent.registerClassId);
                        const stuSubjects = selectedStudent.subjects ?? getStudentSubjects(selectedStudent.id);
                        const stuSubjectClasses = getStudentSubjectClasses(selectedStudent.id);

                        return (
                            <div className="flex flex-col h-full max-h-[90vh]">
                                <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground relative overflow-hidden">
                                    <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                                    <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-primary-foreground/10 blur-3xl" />

                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black shadow-xl border border-white/30">
                                            {selectedStudent.firstName?.charAt(0)}{selectedStudent.lastName?.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-4xl font-black tracking-tight">{selectedStudent.name}</h2>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-sm">{selectedStudent.status}</Badge>
                                                <span className="opacity-80 font-bold text-sm tracking-wide">{selectedStudent.administrationNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 space-y-8 overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl border-2 bg-muted/20">
                                            <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Academic Status</div>
                                            <div className="text-xl font-black">{grade?.name}</div>
                                            <div className="text-xs font-bold text-muted-foreground">{regClass?.name} Homeroom</div>
                                        </div>
                                        <div className="p-4 rounded-xl border-2 bg-muted/20">
                                            <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Contact Details</div>
                                            <div className="text-sm font-bold truncate">{selectedStudent.email || "No email documented"}</div>
                                            <div className="text-[10px] text-muted-foreground mt-1">Admission Year: {selectedStudent.admissionYear}</div>
                                        </div>
                                        <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                                            <div className="text-[10px] uppercase font-black tracking-widest text-primary mb-1">Security PIN</div>
                                            <div className="text-2xl font-mono tracking-[0.3em] font-black text-primary">{selectedStudent.pin}</div>
                                            <div className="text-[10px] text-primary/60 mt-1 font-bold">Learner Login Code</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                                                <BookOpen className="h-5 w-5 text-primary" />
                                                Registered Subjects
                                            </h3>
                                            <Badge variant="secondary" className="font-black">{stuSubjects.length} Items</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {stuSubjects.map(ss => {
                                                const sub = subjects.find(s => s.id === ss.subjectId);
                                                return (
                                                    <div key={ss.id} className="p-4 rounded-xl border-2 hover:border-primary/30 transition-all flex items-center group">
                                                        <div className="h-2 w-2 rounded-full bg-primary/30 group-hover:bg-primary mr-3 transition-colors" />
                                                        <span className="text-sm font-bold">{sub?.name || "Unknown"}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <Separator className="h-[2px]" />

                                    <div className="space-y-4 pb-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                                                <School className="h-5 w-5 text-primary" />
                                                Teaching Group Placements
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {stuSubjectClasses.map(ssc => {
                                                const sc = subjectClasses.find(c => c.id === ssc.subjectClassId);
                                                const sub = subjects.find(s => s.id === sc?.subjectId);
                                                const tchr = teachers.find(t => t.id === sc?.teacherId);
                                                return (
                                                    <div key={ssc.id} className="p-4 rounded-xl border-2 shadow-sm bg-primary/5 border-primary/10">
                                                        <div className="font-black text-base">{sc?.name || "Unknown"}</div>
                                                        <div className="text-[11px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">{sub?.name}</div>
                                                        <div className="text-xs font-bold text-primary mt-2">Prof. {tchr?.name || "TBA"}</div>
                                                    </div>
                                                );
                                            })}
                                            {stuSubjectClasses.length === 0 && (
                                                <div className="col-span-2 text-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
                                                    <Users className="h-8 w-8 mx-auto opacity-20 mb-2" />
                                                    <p className="text-sm text-muted-foreground font-bold">No subject class enrollments found.</p>
                                                </div>
                                            )}
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

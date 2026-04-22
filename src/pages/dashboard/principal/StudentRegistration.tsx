import { useState } from "react";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSubjects } from "@/hooks/useSubjects";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    UserPlus, BookOpen, School, CheckCircle2, ChevronRight, ChevronLeft, GraduationCap, Users
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StudentRegistration() {
    const {
        grades, registerClasses, subjectClasses,
        students, addStudent,
        autoAssignSubjectClasses, getRegisterClassStudents,
        batchAssignSubjectClasses, getSubjectClassEnrollment,
    } = useRegistrationData();
    const { subjects } = useSubjects();
    const { teachers } = useSchoolData();

    // Registration form state
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        gender: "",
        email: "",
        administrationNumber: "",
        admissionYear: new Date().getFullYear().toString(),
        gradeId: "",
        registerClassId: "",
        selectedSubjects: [] as string[],
        selectedClassIds: {} as Record<string, string>,
    });

    const selectedGrade = grades.find(g => g.id === form.gradeId);
    const gradeSubjects = subjects.filter(s => selectedGrade && s.gradeTier === selectedGrade.level.toString());
    const coreSubjects = gradeSubjects.filter(s => s.category === "core" || !s.category);
    const electiveSubjects = gradeSubjects.filter(s => s.category === "elective");
    const gradeRegClasses = registerClasses.filter(rc => rc.gradeId === form.gradeId);
    const isUpperGrade = selectedGrade && selectedGrade.level >= 10;

    const resetForm = () => {
        setForm({
            firstName: "", lastName: "", gender: "", email: "",
            administrationNumber: "", admissionYear: new Date().getFullYear().toString(),
            gradeId: "", registerClassId: "", selectedSubjects: [],
            selectedClassIds: {},
        });
        setStep(1);
    };

    const handleRegister = async (overrideSubjects?: string[]) => {
        if (!form.firstName || !form.lastName || !form.gender || !form.gradeId || !form.registerClassId) {
            toast.error("Please fill in all required fields");
            return;
        }

        const regClass = registerClasses.find(rc => rc.id === form.registerClassId);
        if (regClass) {
            const currentCount = getRegisterClassStudents(form.registerClassId).length;
            if (currentCount >= regClass.maxStudents) {
                toast.error("Register class is at full capacity");
                return;
            }
        }

        let subjectIds = overrideSubjects || form.selectedSubjects;
        if (!isUpperGrade) {
            subjectIds = gradeSubjects.map(s => s.id);
        }

        if (subjectIds.length === 0) {
            toast.error("No subjects assigned for this grade.");
            return;
        }

        try {
            const newStudent = await addStudent({
                firstName: form.firstName,
                lastName: form.lastName,
                gender: form.gender,
                email: form.email,
                administrationNumber: form.administrationNumber,
                admissionYear: form.admissionYear,
                gradeId: form.gradeId,
                grade: selectedGrade?.name || "",
                registerClassId: form.registerClassId,
                studentClass: regClass?.name || "",
                status: "active",
            }, { subjectIds });

            try {
                // Perform batch assignments for each selected class
                const classAssignments = Object.values(form.selectedClassIds).filter(Boolean);
                
                if (classAssignments.length > 0) {
                   await batchAssignSubjectClasses(newStudent.id, classAssignments);
                   toast.success(`${form.firstName} ${form.lastName} registered and placed into ${classAssignments.length} specific classes.`);
                } else {
                    // Fallback to auto-assignment if no manual classes picked
                    const placements = await autoAssignSubjectClasses(newStudent.id, subjectIds, form.gradeId);
                    toast.success(`${form.firstName} ${form.lastName} registered successfully! Auto-placed into ${placements.length} classes.`);
                }
            } catch (err) {
                toast.warning(`${form.firstName} ${form.lastName} registered, but subject class placement failed. You can add them manually in Classes.`);
                console.error("Subject class placement error:", err);
            }
            resetForm();
        } catch (err: any) {
            console.error("Student registration error:", err);
            
            // Handle specific error types
            if (err?.message?.includes("Email already registered") || err?.message?.includes("email_exists")) {
                toast.error(`Email "${form.email}" is already registered. Please use a different email address.`);
            } else if (err?.message?.includes("Already exists")) {
                toast.error(`A student with email "${form.email}" already exists in the system.`);
            } else {
                toast.error(err?.message || "Failed to register student. Please try again.");
            }
        }
    };

    const toggleSubject = (subjectId: string) => {
        setForm(prev => ({
            ...prev,
            selectedSubjects: prev.selectedSubjects.includes(subjectId)
                ? prev.selectedSubjects.filter(id => id !== subjectId)
                : [...prev.selectedSubjects, subjectId],
        }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                    <UserPlus className="h-10 w-10 text-primary" />
                    New Student Registration
                </h1>
                <p className="text-muted-foreground font-medium">Complete the form below to enroll a new learner and automate class placements.</p>
            </div>

            {/* Progress Stepper */}
            <div className="flex items-center justify-between px-4">
                {[
                    { id: 1, label: "Personal Info", icon: Users },
                    { id: 2, label: "Grading & Class", icon: School },
                    { id: 3, label: "Subjects", icon: BookOpen },
                    { id: 4, label: "Placement", icon: CheckCircle2 }
                ].map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 shadow-sm",
                                step === s.id ? "bg-primary text-primary-foreground border-primary scale-110 shadow-primary/20" :
                                    step > s.id ? "bg-green-500 border-green-500 text-white" : "bg-background text-muted-foreground border-muted"
                            )}>
                                {step > s.id ? <CheckCircle2 className="h-6 w-6" /> : <s.icon className="h-6 w-6" />}
                            </div>
                            <span className={cn("text-xs font-black uppercase tracking-widest", step >= s.id ? "text-primary" : "text-muted-foreground")}>{s.label}</span>
                        </div>
                        {i < 3 && (
                            <div className="flex-1 mx-4 h-[2px] bg-muted relative overflow-hidden">
                                <div className={cn("absolute inset-0 bg-primary transition-all duration-500", step > s.id ? "translate-x-0" : "-translate-x-full")} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Card className="border-2 shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-8">
                    <CardTitle className="text-2xl font-black">
                        {step === 1 ? "Personal Details" : 
                         step === 2 ? "Grade & Class Selection" : 
                         step === 3 ? "Subject Selection" : "Specific Class Placement"}
                    </CardTitle>
                    <CardDescription className="font-bold">
                        {step === 1 ? "Enter name, gender and official identification data." :
                            step === 2 ? "Assign the student to a grade level and homeroom group." :
                                step === 3 ? "Choose core and elective subjects for the academic year." :
                                "Assign the student to specific subject class groups."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider">First Name *</Label>
                                    <Input placeholder="e.g. Liam" value={form.firstName} className="h-12 border-2"
                                        onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider">Last Name *</Label>
                                    <Input placeholder="e.g. Nkosi" value={form.lastName} className="h-12 border-2"
                                        onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wider">Gender Orientation *</Label>
                                <div className="flex gap-4">
                                    {["Male", "Female"].map(g => (
                                        <button key={g} type="button"
                                            onClick={() => setForm({ ...form, gender: g })}
                                            className={cn("flex-1 p-4 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-3",
                                                form.gender === g ? "border-primary bg-primary/5 text-primary" : "border-muted hover:bg-muted/50"
                                            )}>
                                            <div className={cn("h-4 w-4 rounded-full border-2", form.gender === g ? "border-primary bg-primary ring-2 ring-primary/20" : "border-muted")} />
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wider">Official Email Address</Label>
                                <Input type="email" placeholder="student.name@school-domain.com" value={form.email} className="h-12 border-2"
                                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider">Admission Number *</Label>
                                    <Input placeholder="LRN-2026-XXXX" value={form.administrationNumber} className="h-12 border-2 font-mono"
                                        onChange={(e) => setForm({ ...form, administrationNumber: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider">Admission Year</Label>
                                    <Input value={form.admissionYear} className="h-12 border-2"
                                        onChange={(e) => setForm({ ...form, admissionYear: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Grade & Register Class */}
                    {step === 2 && (
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-sm font-black">Select Grade Level</Label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {grades.map(g => (
                                        <button key={g.id} type="button"
                                            onClick={() => setForm({ ...form, gradeId: g.id, registerClassId: "", selectedSubjects: [] })}
                                            className={cn("p-4 rounded-xl border-2 text-center transition-all",
                                                form.gradeId === g.id ? "border-primary bg-primary text-primary-foreground shadow-lg" : "border-muted hover:border-primary/30"
                                            )}>
                                            <div className="text-lg font-black">{g.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.gradeId && (
                                <div className="space-y-4 pt-4 border-t-2 border-dashed">
                                    <Label className="text-sm font-black flex items-center gap-2">
                                        Assign to Register Class (Homeroom)
                                        <Badge variant="outline" className="text-[10px]">Available in {selectedGrade?.name}</Badge>
                                    </Label>
                                    {gradeRegClasses.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {gradeRegClasses.map(rc => {
                                                const enrolled = getRegisterClassStudents(rc.id).length;
                                                const teacher = teachers.find(t => t.id === rc.classTeacherId);
                                                const isFull = enrolled >= rc.maxStudents;
                                                return (
                                                    <button key={rc.id} type="button" disabled={isFull}
                                                        onClick={() => setForm({ ...form, registerClassId: rc.id })}
                                                        className={cn(
                                                            "p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                                                            form.registerClassId === rc.id ? "border-primary bg-primary/5 shadow-md shadow-primary/5" : "border-muted hover:border-muted-foreground/30",
                                                            isFull && "opacity-40 grayscale pointer-events-none"
                                                        )}>
                                                        {form.registerClassId === rc.id && <div className="absolute top-0 right-0 p-2"><CheckCircle2 className="h-5 w-5 text-primary" /></div>}
                                                        <div className="font-black text-xl">{rc.name}</div>
                                                        <div className="text-xs text-muted-foreground font-bold group-hover:text-primary transition-colors">{teacher?.name || "Unassigned"}</div>
                                                        <div className="mt-4 flex items-center justify-between">
                                                            <div className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Class Load</div>
                                                            <span className="text-xs font-black">{enrolled} / {rc.maxStudents}</span>
                                                        </div>
                                                        <div className="mt-1 h-1 w-full bg-muted rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary" style={{ width: `${(enrolled / rc.maxStudents) * 100}%` }} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center rounded-2xl bg-muted/20 border-2 border-dashed">
                                            <GraduationCap className="h-10 w-10 mx-auto opacity-20 mb-3" />
                                            <p className="font-black text-muted-foreground italic">No register classes found for this grade.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Subjects */}
                    {step === 3 && (
                        <div className="space-y-8">
                            <div className="p-6 bg-primary/5 border-2 border-primary/10 rounded-2xl">
                                <h3 className="text-lg font-black mb-1">Grade {selectedGrade?.level ?? selectedGrade?.name} Academic Profile</h3>
                                <p className="text-sm font-medium text-muted-foreground">Select or deselect subjects for this learner. At least one subject is required.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Core Curriculum</h4>
                                        <Badge variant="outline" className="border-green-500 text-green-600">Select/Deselect</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {coreSubjects.map(s => (
                                            <button key={s.id} type="button"
                                                onClick={() => toggleSubject(s.id)}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 text-left font-black transition-all flex items-center justify-between group",
                                                    form.selectedSubjects.includes(s.id) ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-muted hover:border-primary/20"
                                                )}>
                                                <span className="text-sm">{s.name}</span>
                                                <div className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    form.selectedSubjects.includes(s.id) ? "bg-primary border-primary text-white" : "border-muted group-hover:border-primary/40")}>
                                                    {form.selectedSubjects.includes(s.id) && <CheckCircle2 className="h-4 w-4" />}
                                                </div>
                                            </button>
                                        ))}
                                        {coreSubjects.length === 0 && <p className="text-xs italic text-muted-foreground">No defined core subjects.</p>}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Elective Choices</h4>
                                        <Badge variant="outline" className="border-primary text-primary">Select/Deselect</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {electiveSubjects.map(s => (
                                            <button key={s.id} type="button"
                                                onClick={() => toggleSubject(s.id)}
                                                className={cn(
                                                    "p-4 rounded-xl border-2 text-left font-black transition-all flex items-center justify-between group",
                                                    form.selectedSubjects.includes(s.id) ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-muted hover:border-primary/20"
                                                )}>
                                                <span className="text-sm">{s.name}</span>
                                                <div className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    form.selectedSubjects.includes(s.id) ? "bg-primary border-primary text-white" : "border-muted group-hover:border-primary/40")}>
                                                    {form.selectedSubjects.includes(s.id) && <CheckCircle2 className="h-4 w-4" />}
                                                </div>
                                            </button>
                                        ))}
                                        {electiveSubjects.length === 0 && (
                                            <div className="p-8 text-center rounded-xl bg-muted/20 border-2 border-dashed">
                                                <p className="text-xs font-bold text-muted-foreground">No elective options for this grade.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Step 4: Class Placement */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="p-6 bg-primary/5 border-2 border-primary/10 rounded-2xl mb-6">
                                <h3 className="text-lg font-black mb-1">Specific Class Assignment</h3>
                                <p className="text-sm font-medium text-muted-foreground">Select which class group the student will join for each selected subject.</p>
                            </div>

                            <div className="space-y-4">
                                {form.selectedSubjects.map(subId => {
                                    const subject = subjects.find(s => s.id === subId);
                                    const availableClasses = subjectClasses.filter(sc => 
                                        sc.subjectId === subId && sc.gradeId === form.gradeId
                                    );

                                    return (
                                        <div key={subId} className="p-4 rounded-2xl border-2 bg-card space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-primary/10 text-primary font-black uppercase text-[10px]">
                                                        {subject?.category || "Subject"}
                                                    </Badge>
                                                    <span className="font-black text-sm">{subject?.name}</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-black uppercase">
                                                    {availableClasses.length} Available
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {availableClasses.map(sc => {
                                                    const enrolled = getSubjectClassEnrollment(sc.id);
                                                    const isFull = enrolled >= (sc.capacity || 35);
                                                    const isSelected = form.selectedClassIds[subId] === sc.id;

                                                    return (
                                                        <button
                                                            key={sc.id}
                                                            type="button"
                                                            disabled={isFull}
                                                            onClick={() => setForm(prev => ({
                                                                ...prev,
                                                                selectedClassIds: { ...prev.selectedClassIds, [subId]: sc.id }
                                                            }))}
                                                            className={cn(
                                                                "p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group",
                                                                isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/20",
                                                                isFull && "opacity-40 grayscale pointer-events-none"
                                                            )}
                                                        >
                                                            <div className="font-black text-sm">{sc.name}</div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <div className="text-[9px] font-black uppercase text-muted-foreground">Load</div>
                                                                <span className="text-[10px] font-bold">{enrolled} / {sc.capacity || 35}</span>
                                                            </div>
                                                            <div className="mt-1 h-1 w-full bg-muted rounded-full overflow-hidden">
                                                                <div 
                                                                    className={cn("h-full", isFull ? "bg-red-500" : "bg-primary")} 
                                                                    style={{ width: `${Math.min(100, (enrolled / (sc.capacity || 35)) * 100)}%` }} 
                                                                />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {availableClasses.length === 0 && (
                                                    <p className="text-xs text-muted-foreground italic p-2">No classes created for this subject yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 p-8 border-t flex justify-between gap-4">
                    {step > 1 ? (
                        <Button variant="outline" onClick={() => setStep(step - 1)} className="h-14 px-8 border-2 font-black rounded-xl gap-2">
                            <ChevronLeft className="h-5 w-5" /> Previous Phase
                        </Button>
                    ) : <div />}

                    <Button
                        onClick={() => {
                            if (step === 1) {
                                if (!form.firstName || !form.lastName || !form.gender || !form.administrationNumber) {
                                    toast.error("Required fields missing"); return;
                                }
                                setStep(2);
                            } else if (step === 2) {
                                if (!form.gradeId || !form.registerClassId) {
                                    toast.error("Grade and Class assignment required"); return;
                                }
                                setForm(prev => ({
                                    ...prev,
                                    selectedSubjects: isUpperGrade ? prev.selectedSubjects : gradeSubjects.map(s => s.id),
                                }));
                                setStep(3);
                            } else if (step === 3) {
                                if (form.selectedSubjects.length === 0) {
                                    toast.error("Select at least one subject for this learner.");
                                    return;
                                }
                                // Pre-select first available class for each subject to make it easier
                                const initialClasses: Record<string, string> = { ...form.selectedClassIds };
                                form.selectedSubjects.forEach(subId => {
                                    if (!initialClasses[subId]) {
                                        const first = subjectClasses.find(sc => sc.subjectId === subId && sc.gradeId === form.gradeId);
                                        if (first) initialClasses[subId] = first.id;
                                    }
                                });
                                setForm(prev => ({ ...prev, selectedClassIds: initialClasses }));
                                setStep(4);
                            } else {
                                const unplacedSubjects = form.selectedSubjects.filter(subId => !form.selectedClassIds[subId]);
                                if (unplacedSubjects.length > 0) {
                                    const names = unplacedSubjects.map(id => subjects.find(s => s.id === id)?.name).join(", ");
                                    toast.error(`Please select a class for: ${names}`);
                                    return;
                                }
                                handleRegister(form.selectedSubjects);
                            }
                        }}
                        className={cn("h-14 px-10 font-black rounded-xl gap-2 text-lg shadow-lg transition-all",
                            step === 4 ? "bg-green-600 hover:bg-green-700 shadow-green-500/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                        )}
                    >
                        {step === 4 ? "Complete Enrollment" : "Next Phase"}
                        {step < 4 && <ChevronRight className="h-5 w-5" />}
                        {step === 4 && <CheckCircle2 className="h-5 w-5" />}
                    </Button>
                </CardFooter>
            </Card>

            {/* Quick Summary Sidebar/Bottom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-2 shadow-sm">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-xs uppercase font-black tracking-widest text-muted-foreground">Recent Registrations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            {students.slice(-4).reverse().map(s => (
                                <div key={s.id} className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                        {s.firstName?.[0]}{s.lastName?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate">{s.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground truncate">{s.studentClass} • {s.administrationNumber}</p>
                                    </div>
                                </div>
                            ))}
                            {students.length === 0 && <p className="text-[10px] font-bold text-muted-foreground italic">No learners registered yet.</p>}
                        </div>
                    </CardContent>
                </Card>
                <div className="md:col-span-2 flex flex-col justify-center bg-primary/5 border-2 border-dashed rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <h3 className="text-xl font-black mb-2">Need to find someone?</h3>
                    <p className="text-sm font-bold text-muted-foreground mb-6">Manage all learners, track attendance, and view academic history in the central directory.</p>
                    <Button variant="secondary" className="w-fit font-black rounded-xl border-2 hover:bg-primary hover:text-white transition-all" asChild>
                        <a href="/principal/directory">Access Student Directory</a>
                    </Button>
                </div>
            </div>
        </div>
    );
}

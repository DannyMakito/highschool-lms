import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, CalendarDays, Clock3, ListChecks, Plus, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { HelpIcon } from "@/components/help/HelpIcon";
import supabase from "@/lib/supabase";
import { toast } from "sonner";

type AttendanceMark = "present" | "absent" | "late" | "excused";

type AttendanceSession = {
    id: string;
    registerClassId: string;
    attendanceDate: string;
    markedBy: string | null;
    status: "open" | "closed";
    createdAt?: string;
    updatedAt?: string;
};

type AttendanceEntry = {
    id: string;
    sessionId: string;
    studentId: string;
    mark: AttendanceMark;
    note: string | null;
    markedAt?: string;
};

type TimetableSlot = {
    id: string;
    registerClassId: string;
    dayOfWeek: number;
    periodLabel: string;
    startTime: string;
    endTime: string;
    activityTitle: string;
    location: string | null;
    notes: string | null;
};

type SlotFormState = {
    dayOfWeek: number;
    periodLabel: string;
    startTime: string;
    endTime: string;
    activityTitle: string;
    location: string;
    notes: string;
};

type EntryDraft = {
    mark: AttendanceMark | "unmarked";
    note: string;
};

const MARK_OPTIONS: Array<{ value: AttendanceMark; label: string }> = [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "late", label: "Late" },
    { value: "excused", label: "Excused" },
];

const DAY_OPTIONS = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
];

const DEFAULT_SLOT_FORM: SlotFormState = {
    dayOfWeek: 1,
    periodLabel: "Period 1",
    startTime: "08:00",
    endTime: "08:45",
    activityTitle: "",
    location: "",
    notes: "",
};

const getTodayIsoDate = () => new Date().toISOString().split("T")[0];

const isSchemaMissingError = (error: any) => {
    const code = error?.code || "";
    const message = error?.message || "";
    return code === "PGRST205" || code === "42P01" || message.toLowerCase().includes("does not exist");
};

export default function RegisterManagement() {
    const { user } = useAuth();
    const { registerClasses, getRegisterClassStudents, grades } = useRegistrationData();

    const [selectedRegisterClassId, setSelectedRegisterClassId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate());
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
    const [entriesByStudentId, setEntriesByStudentId] = useState<Record<string, AttendanceEntry>>({});
    const [entryDrafts, setEntryDrafts] = useState<Record<string, EntryDraft>>({});
    const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
    const [slotForm, setSlotForm] = useState<SlotFormState>(DEFAULT_SLOT_FORM);
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
    const [isSavingEntry, setIsSavingEntry] = useState<string | null>(null);
    const [isSavingSlot, setIsSavingSlot] = useState(false);
    const [isSchemaMissing, setIsSchemaMissing] = useState(false);

    const teacherRegisterClasses = useMemo(
        () => registerClasses.filter((registerClass) => registerClass.classTeacherId === user?.id),
        [registerClasses, user?.id]
    );

    useEffect(() => {
        if (!selectedRegisterClassId && teacherRegisterClasses.length > 0) {
            setSelectedRegisterClassId(teacherRegisterClasses[0].id);
        }
    }, [selectedRegisterClassId, teacherRegisterClasses]);

    const selectedRegisterClass = useMemo(
        () => teacherRegisterClasses.find((registerClass) => registerClass.id === selectedRegisterClassId) || null,
        [selectedRegisterClassId, teacherRegisterClasses]
    );

    const selectedRegisterStudents = useMemo(
        () => (selectedRegisterClass ? getRegisterClassStudents(selectedRegisterClass.id) : []),
        [getRegisterClassStudents, selectedRegisterClass]
    );

    const selectedGrade = useMemo(
        () => grades.find((grade) => grade.id === selectedRegisterClass?.gradeId),
        [grades, selectedRegisterClass?.gradeId]
    );

    const seedDraftsFromEntries = (entries: Record<string, AttendanceEntry>) => {
        const nextDrafts: Record<string, EntryDraft> = {};
        selectedRegisterStudents.forEach((student) => {
            const existing = entries[student.id];
            nextDrafts[student.id] = {
                mark: existing?.mark || "unmarked",
                note: existing?.note || "",
            };
        });
        setEntryDrafts(nextDrafts);
    };

    const loadAttendanceAndTimetable = async () => {
        if (!selectedRegisterClassId) return;

        setIsLoadingAttendance(true);
        setIsSchemaMissing(false);

        const [sessionsRes, slotsRes] = await Promise.all([
            supabase
                .from("register_attendance_sessions")
                .select("*")
                .eq("register_class_id", selectedRegisterClassId)
                .order("attendance_date", { ascending: false })
                .limit(30),
            supabase
                .from("register_timetable_slots")
                .select("*")
                .eq("register_class_id", selectedRegisterClassId)
                .order("day_of_week", { ascending: true })
                .order("start_time", { ascending: true }),
        ]);

        if (sessionsRes.error || slotsRes.error) {
            console.error("Failed to load register data", {
                sessionsError: sessionsRes.error,
                slotsError: slotsRes.error,
            });
            if (isSchemaMissingError(sessionsRes.error) || isSchemaMissingError(slotsRes.error)) {
                setIsSchemaMissing(true);
            } else {
                toast.error("Could not load register attendance data");
            }
            setSessions([]);
            setActiveSession(null);
            setEntriesByStudentId({});
            setTimetableSlots([]);
            setEntryDrafts({});
            setIsLoadingAttendance(false);
            return;
        }

        const mappedSessions: AttendanceSession[] = (sessionsRes.data || []).map((session) => ({
            id: session.id,
            registerClassId: session.register_class_id,
            attendanceDate: session.attendance_date,
            markedBy: session.marked_by,
            status: session.status || "open",
            createdAt: session.created_at,
            updatedAt: session.updated_at,
        }));

        const mappedSlots: TimetableSlot[] = (slotsRes.data || []).map((slot) => ({
            id: slot.id,
            registerClassId: slot.register_class_id,
            dayOfWeek: Number(slot.day_of_week),
            periodLabel: slot.period_label,
            startTime: slot.start_time,
            endTime: slot.end_time,
            activityTitle: slot.activity_title,
            location: slot.location,
            notes: slot.notes,
        }));

        setSessions(mappedSessions);
        setTimetableSlots(mappedSlots);

        const selectedSession = mappedSessions.find((session) => session.attendanceDate === selectedDate) || null;
        setActiveSession(selectedSession);

        if (!selectedSession) {
            setEntriesByStudentId({});
            seedDraftsFromEntries({});
            setIsLoadingAttendance(false);
            return;
        }

        const entriesRes = await supabase
            .from("register_attendance_entries")
            .select("*")
            .eq("session_id", selectedSession.id);

        if (entriesRes.error) {
            console.error("Failed to load attendance entries", entriesRes.error);
            if (isSchemaMissingError(entriesRes.error)) {
                setIsSchemaMissing(true);
            } else {
                toast.error("Could not load attendance entries");
            }
            setEntriesByStudentId({});
            seedDraftsFromEntries({});
            setIsLoadingAttendance(false);
            return;
        }

        const nextEntriesByStudentId = (entriesRes.data || []).reduce<Record<string, AttendanceEntry>>((acc, row) => {
            acc[row.student_id] = {
                id: row.id,
                sessionId: row.session_id,
                studentId: row.student_id,
                mark: row.mark as AttendanceMark,
                note: row.note,
                markedAt: row.marked_at,
            };
            return acc;
        }, {});

        setEntriesByStudentId(nextEntriesByStudentId);
        seedDraftsFromEntries(nextEntriesByStudentId);
        setIsLoadingAttendance(false);
    };

    useEffect(() => {
        void loadAttendanceAndTimetable();
    }, [selectedRegisterClassId, selectedDate]);

    const ensureActiveSession = async () => {
        if (!selectedRegisterClassId || !user?.id) {
            throw new Error("Missing class or teacher identity.");
        }

        if (activeSession && activeSession.attendanceDate === selectedDate) {
            return activeSession;
        }

        const upsertRes = await supabase
            .from("register_attendance_sessions")
            .upsert(
                {
                    register_class_id: selectedRegisterClassId,
                    attendance_date: selectedDate,
                    marked_by: user.id,
                    status: "open",
                },
                { onConflict: "register_class_id,attendance_date" }
            )
            .select("*")
            .single();

        if (upsertRes.error) {
            throw upsertRes.error;
        }

        const nextSession: AttendanceSession = {
            id: upsertRes.data.id,
            registerClassId: upsertRes.data.register_class_id,
            attendanceDate: upsertRes.data.attendance_date,
            markedBy: upsertRes.data.marked_by,
            status: upsertRes.data.status || "open",
            createdAt: upsertRes.data.created_at,
            updatedAt: upsertRes.data.updated_at,
        };

        setActiveSession(nextSession);
        setSessions((prev) => {
            const existing = prev.filter((session) => session.id !== nextSession.id);
            return [nextSession, ...existing].sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime());
        });

        return nextSession;
    };

    const saveStudentEntry = async (studentId: string) => {
        const draft = entryDrafts[studentId];
        if (!draft) return;

        setIsSavingEntry(studentId);

        try {
            const session = await ensureActiveSession();

            if (draft.mark === "unmarked") {
                const existing = entriesByStudentId[studentId];
                if (existing) {
                    const deleteRes = await supabase
                        .from("register_attendance_entries")
                        .delete()
                        .eq("id", existing.id);

                    if (deleteRes.error) throw deleteRes.error;
                }

                setEntriesByStudentId((prev) => {
                    const next = { ...prev };
                    delete next[studentId];
                    return next;
                });
                return;
            }

            const upsertRes = await supabase
                .from("register_attendance_entries")
                .upsert(
                    {
                        session_id: session.id,
                        student_id: studentId,
                        mark: draft.mark,
                        note: draft.note.trim() || null,
                    },
                    { onConflict: "session_id,student_id" }
                )
                .select("*")
                .single();

            if (upsertRes.error) throw upsertRes.error;

            const nextEntry: AttendanceEntry = {
                id: upsertRes.data.id,
                sessionId: upsertRes.data.session_id,
                studentId: upsertRes.data.student_id,
                mark: upsertRes.data.mark as AttendanceMark,
                note: upsertRes.data.note,
                markedAt: upsertRes.data.marked_at,
            };

            setEntriesByStudentId((prev) => ({
                ...prev,
                [studentId]: nextEntry,
            }));
            toast.success("Register entry saved");
        } catch (error: any) {
            console.error("Failed to save register entry", error);
            if (isSchemaMissingError(error)) {
                setIsSchemaMissing(true);
            } else {
                toast.error(error?.message || "Could not save register entry");
            }
        } finally {
            setIsSavingEntry(null);
        }
    };

    const markAllPresent = async () => {
        if (!selectedRegisterStudents.length) return;
        setIsSavingEntry("all");

        try {
            const session = await ensureActiveSession();
            const payload = selectedRegisterStudents.map((student) => ({
                session_id: session.id,
                student_id: student.id,
                mark: "present" as AttendanceMark,
                note: null,
            }));

            const upsertRes = await supabase
                .from("register_attendance_entries")
                .upsert(payload, { onConflict: "session_id,student_id" })
                .select("*");

            if (upsertRes.error) throw upsertRes.error;

            const nextMap: Record<string, AttendanceEntry> = {};
            (upsertRes.data || []).forEach((row) => {
                nextMap[row.student_id] = {
                    id: row.id,
                    sessionId: row.session_id,
                    studentId: row.student_id,
                    mark: row.mark as AttendanceMark,
                    note: row.note,
                    markedAt: row.marked_at,
                };
            });

            setEntriesByStudentId((prev) => ({
                ...prev,
                ...nextMap,
            }));

            setEntryDrafts((prev) => {
                const next = { ...prev };
                selectedRegisterStudents.forEach((student) => {
                    next[student.id] = { mark: "present", note: "" };
                });
                return next;
            });

            toast.success("Marked all learners as present");
        } catch (error: any) {
            console.error("Failed to mark all present", error);
            if (isSchemaMissingError(error)) {
                setIsSchemaMissing(true);
            } else {
                toast.error(error?.message || "Could not mark all learners");
            }
        } finally {
            setIsSavingEntry(null);
        }
    };

    const closeRegisterForDay = async () => {
        if (!activeSession) return;

        const updateRes = await supabase
            .from("register_attendance_sessions")
            .update({ status: "closed", marked_by: user?.id || null })
            .eq("id", activeSession.id);

        if (updateRes.error) {
            console.error("Failed to close register", updateRes.error);
            toast.error("Could not close register");
            return;
        }

        setActiveSession((prev) => (prev ? { ...prev, status: "closed" } : prev));
        setSessions((prev) => prev.map((session) => (session.id === activeSession.id ? { ...session, status: "closed" } : session)));
        toast.success("Daily register closed");
    };

    const addTimetableSlot = async () => {
        if (!selectedRegisterClassId || !user?.id) return;
        if (!slotForm.activityTitle.trim() || !slotForm.periodLabel.trim()) {
            toast.error("Please complete the activity title and period label.");
            return;
        }

        setIsSavingSlot(true);

        const insertRes = await supabase
            .from("register_timetable_slots")
            .insert({
                register_class_id: selectedRegisterClassId,
                day_of_week: slotForm.dayOfWeek,
                period_label: slotForm.periodLabel.trim(),
                start_time: slotForm.startTime,
                end_time: slotForm.endTime,
                activity_title: slotForm.activityTitle.trim(),
                location: slotForm.location.trim() || null,
                notes: slotForm.notes.trim() || null,
                created_by: user.id,
            })
            .select("*")
            .single();

        if (insertRes.error) {
            console.error("Failed to add timetable slot", insertRes.error);
            if (isSchemaMissingError(insertRes.error)) {
                setIsSchemaMissing(true);
            } else {
                toast.error("Could not add timetable slot");
            }
            setIsSavingSlot(false);
            return;
        }

        const nextSlot: TimetableSlot = {
            id: insertRes.data.id,
            registerClassId: insertRes.data.register_class_id,
            dayOfWeek: Number(insertRes.data.day_of_week),
            periodLabel: insertRes.data.period_label,
            startTime: insertRes.data.start_time,
            endTime: insertRes.data.end_time,
            activityTitle: insertRes.data.activity_title,
            location: insertRes.data.location,
            notes: insertRes.data.notes,
        };

        setTimetableSlots((prev) => [...prev, nextSlot].sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
            return a.startTime.localeCompare(b.startTime);
        }));

        setSlotForm((prev) => ({
            ...DEFAULT_SLOT_FORM,
            dayOfWeek: prev.dayOfWeek,
        }));
        setIsSavingSlot(false);
        toast.success("Timetable slot added");
    };

    const deleteTimetableSlot = async (slotId: string) => {
        const deleteRes = await supabase
            .from("register_timetable_slots")
            .delete()
            .eq("id", slotId);

        if (deleteRes.error) {
            console.error("Failed to delete timetable slot", deleteRes.error);
            toast.error("Could not delete timetable slot");
            return;
        }

        setTimetableSlots((prev) => prev.filter((slot) => slot.id !== slotId));
        toast.success("Timetable slot removed");
    };

    const attendanceCounts = useMemo(() => {
        const values = Object.values(entriesByStudentId);
        const present = values.filter((entry) => entry.mark === "present").length;
        const absent = values.filter((entry) => entry.mark === "absent").length;
        const late = values.filter((entry) => entry.mark === "late").length;
        const excused = values.filter((entry) => entry.mark === "excused").length;
        const pending = Math.max(selectedRegisterStudents.length - values.length, 0);
        return { present, absent, late, excused, pending };
    }, [entriesByStudentId, selectedRegisterStudents.length]);
    const isSessionClosed = activeSession?.status === "closed";

    const groupedSlots = useMemo(() => {
        return DAY_OPTIONS.map((day) => ({
            ...day,
            slots: timetableSlots.filter((slot) => slot.dayOfWeek === day.value),
        }));
    }, [timetableSlots]);

    if (teacherRegisterClasses.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Register & Timetable</h1>
                    <p className="text-muted-foreground">Mark daily attendance and maintain register-class timetable administration.</p>
                </div>
                <Card className="border-muted/20 bg-card/70">
                    <CardContent className="py-16 text-center space-y-2">
                        <p className="font-semibold">You are not currently assigned as a class teacher for a register class.</p>
                        <p className="text-sm text-muted-foreground">
                            Register-class assignment is optional. This page will unlock automatically once a principal assigns you.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-4xl font-black tracking-tight">Register & Timetable</h1>
                        <HelpIcon
                            title="Register Marking"
                            description="As a register-class teacher, you manage daily attendance and class timetable administration."
                            details={[
                                "Select a register class and date to mark attendance.",
                                "Use attendance marks to track present, absent, late, and excused learners.",
                                "Maintain timetable slots per day and period for administrative planning.",
                            ]}
                        />
                    </div>
                    <p className="text-muted-foreground">Track daily register attendance and keep an administrative timetable for your assigned register class.</p>
                </div>
            </div>

            {isSchemaMissing ? (
                <Card className="border-amber-200 bg-amber-50/80">
                    <CardContent className="py-4 text-sm text-amber-900">
                        Register attendance tables are missing. Run `supabase/register_attendance_support.sql` (or migration `008_register_attendance_and_timetable.sql`) to enable persistence.
                    </CardContent>
                </Card>
            ) : null}

            <Card className="border-muted/20 bg-card/70">
                <CardContent className="pt-6 grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                        <Label>Register Class</Label>
                        <Select value={selectedRegisterClassId} onValueChange={setSelectedRegisterClassId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select register class" />
                            </SelectTrigger>
                            <SelectContent>
                                {teacherRegisterClasses.map((registerClass) => (
                                    <SelectItem key={registerClass.id} value={registerClass.id}>
                                        {registerClass.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Attendance Date</Label>
                        <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                    </div>
                    <div className="flex items-end gap-2">
                        <Button onClick={() => void loadAttendanceAndTimetable()} disabled={isLoadingAttendance}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Badge variant="outline">
                            {selectedGrade?.name || "No grade"} | {selectedRegisterStudents.length} learners
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <Card className="border-muted/20 bg-card/70">
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarCheck2 className="h-5 w-5 text-primary" />
                                Daily Register
                            </CardTitle>
                            <CardDescription>
                                {selectedRegisterClass?.name || "Register class"} | {selectedDate}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => void markAllPresent()} disabled={isSavingEntry === "all" || isSchemaMissing || isSessionClosed}>
                                <ListChecks className="mr-2 h-4 w-4" />
                                Mark All Present
                            </Button>
                            <Button onClick={() => void closeRegisterForDay()} disabled={!activeSession || activeSession.status === "closed" || isSchemaMissing}>
                                Close Register
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                            <div className="rounded-xl border p-3">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Present</p>
                                <p className="mt-1 text-2xl font-black text-emerald-600">{attendanceCounts.present}</p>
                            </div>
                            <div className="rounded-xl border p-3">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Absent</p>
                                <p className="mt-1 text-2xl font-black text-rose-600">{attendanceCounts.absent}</p>
                            </div>
                            <div className="rounded-xl border p-3">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Late</p>
                                <p className="mt-1 text-2xl font-black text-amber-600">{attendanceCounts.late}</p>
                            </div>
                            <div className="rounded-xl border p-3">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Excused</p>
                                <p className="mt-1 text-2xl font-black text-blue-600">{attendanceCounts.excused}</p>
                            </div>
                            <div className="rounded-xl border p-3">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pending</p>
                                <p className="mt-1 text-2xl font-black">{attendanceCounts.pending}</p>
                            </div>
                        </div>

                        <div className="rounded-xl border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="font-black">Learner</TableHead>
                                        <TableHead className="font-black">Admin Number</TableHead>
                                        <TableHead className="font-black">Mark</TableHead>
                                        <TableHead className="font-black">Note</TableHead>
                                        <TableHead className="font-black text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedRegisterStudents.map((student) => {
                                        const draft = entryDrafts[student.id] || { mark: "unmarked" as const, note: "" };
                                        return (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-bold">{student.name}</TableCell>
                                                <TableCell className="text-muted-foreground font-mono text-xs">{student.administrationNumber}</TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={draft.mark}
                                                        onValueChange={(value: AttendanceMark | "unmarked") => {
                                                            setEntryDrafts((prev) => ({
                                                                ...prev,
                                                                [student.id]: {
                                                                    ...(prev[student.id] || { mark: "unmarked", note: "" }),
                                                                    mark: value,
                                                                },
                                                                }));
                                                        }}
                                                        disabled={isSessionClosed}
                                                    >
                                                        <SelectTrigger className="w-[150px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="unmarked">Unmarked</SelectItem>
                                                            {MARK_OPTIONS.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={draft.note}
                                                        onChange={(event) => {
                                                            const value = event.target.value;
                                                            setEntryDrafts((prev) => ({
                                                                ...prev,
                                                                [student.id]: {
                                                                    ...(prev[student.id] || { mark: "unmarked", note: "" }),
                                                                    note: value,
                                                                },
                                                                }));
                                                        }}
                                                        placeholder="Optional note"
                                                        disabled={isSessionClosed}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => void saveStudentEntry(student.id)}
                                                        disabled={isSavingEntry === student.id || isSchemaMissing || isSessionClosed}
                                                    >
                                                        <Save className="mr-2 h-3.5 w-3.5" />
                                                        {isSavingEntry === student.id ? "Saving..." : "Save"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {selectedRegisterStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No learners are assigned to this register class.
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-muted/20 bg-card/70">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Register History
                            </CardTitle>
                            <CardDescription>Recent attendance sessions for this class</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[290px] overflow-y-auto">
                            {sessions.length > 0 ? (
                                sessions.map((session) => (
                                    <div key={session.id} className="rounded-lg border p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold">{session.attendanceDate}</p>
                                            <Badge variant={session.status === "closed" ? "secondary" : "outline"}>
                                                {session.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Session ID: {session.id.slice(0, 8)}...</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No attendance sessions yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-muted/20 bg-card/70">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock3 className="h-5 w-5 text-primary" />
                                    Timetable Setup
                                </CardTitle>
                                <HelpIcon
                                    className="h-7 w-7"
                                    title="Timetable Administration"
                                    description="Create and maintain the register-class timetable even if you do not teach all subject periods."
                                    details={[
                                        "Add period slots per weekday for administrative planning.",
                                        "Store class activities, locations, and notes.",
                                        "Use this as the class schedule reference for register responsibility.",
                                    ]}
                                />
                            </div>
                            <CardDescription>Create day and period slots for the selected register class</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-2">
                                <Label>Day</Label>
                                <Select
                                    value={String(slotForm.dayOfWeek)}
                                    onValueChange={(value) => setSlotForm((prev) => ({ ...prev, dayOfWeek: Number(value) }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {DAY_OPTIONS.map((day) => (
                                            <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-2">
                                    <Label>Period Label</Label>
                                    <Input
                                        value={slotForm.periodLabel}
                                        onChange={(event) => setSlotForm((prev) => ({ ...prev, periodLabel: event.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Activity</Label>
                                    <Input
                                        value={slotForm.activityTitle}
                                        onChange={(event) => setSlotForm((prev) => ({ ...prev, activityTitle: event.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-2">
                                    <Label>Start</Label>
                                    <Input
                                        type="time"
                                        value={slotForm.startTime}
                                        onChange={(event) => setSlotForm((prev) => ({ ...prev, startTime: event.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>End</Label>
                                    <Input
                                        type="time"
                                        value={slotForm.endTime}
                                        onChange={(event) => setSlotForm((prev) => ({ ...prev, endTime: event.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Location</Label>
                                <Input
                                    value={slotForm.location}
                                    onChange={(event) => setSlotForm((prev) => ({ ...prev, location: event.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Notes</Label>
                                <Input
                                    value={slotForm.notes}
                                    onChange={(event) => setSlotForm((prev) => ({ ...prev, notes: event.target.value }))}
                                />
                            </div>
                            <Button onClick={() => void addTimetableSlot()} disabled={isSavingSlot || isSchemaMissing}>
                                <Plus className="mr-2 h-4 w-4" />
                                {isSavingSlot ? "Saving..." : "Add Timetable Slot"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-muted/20 bg-card/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Weekly Timetable
                    </CardTitle>
                    <CardDescription>Scheduled slots for {selectedRegisterClass?.name || "selected class"}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {groupedSlots.map((day) => (
                            <div key={day.value} className="rounded-xl border p-3 space-y-2">
                                <h3 className="font-black">{day.label}</h3>
                                {day.slots.length > 0 ? (
                                    day.slots.map((slot) => (
                                        <div key={slot.id} className="rounded-lg border bg-background p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-bold">{slot.periodLabel}</p>
                                                    <p className="text-sm">{slot.activityTitle}</p>
                                                    <p className="text-xs text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                                                    {slot.location ? <p className="text-xs text-muted-foreground">Room: {slot.location}</p> : null}
                                                    {slot.notes ? <p className="text-xs text-muted-foreground">Notes: {slot.notes}</p> : null}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                    onClick={() => void deleteTimetableSlot(slot.id)}
                                                    disabled={isSchemaMissing}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No slots scheduled.</p>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

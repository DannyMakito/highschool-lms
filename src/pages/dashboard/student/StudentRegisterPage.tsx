import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, CalendarDays, Clock3, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HelpIcon } from "@/components/help/HelpIcon";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useSchoolData } from "@/hooks/useSchoolData";
import supabase from "@/lib/supabase";
import { toast } from "sonner";

type AttendanceMark = "present" | "absent" | "late" | "excused";

type AttendanceSession = {
    id: string;
    attendanceDate: string;
    status: "open" | "closed";
};

type AttendanceEntry = {
    id: string;
    sessionId: string;
    mark: AttendanceMark;
    note: string | null;
};

type TimetableSlot = {
    id: string;
    dayOfWeek: number;
    periodLabel: string;
    startTime: string;
    endTime: string;
    activityTitle: string;
    location: string | null;
    notes: string | null;
};

const DAY_OPTIONS = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
];

const isSchemaMissingError = (error: any) => {
    const code = error?.code || "";
    const message = error?.message || "";
    return code === "PGRST205" || code === "42P01" || message.toLowerCase().includes("does not exist");
};

const formatMark = (mark?: AttendanceMark) => {
    if (!mark) return "Unmarked";
    return mark.charAt(0).toUpperCase() + mark.slice(1);
};

export default function StudentRegisterPage() {
    const { user } = useAuth();
    const { students, grades, registerClasses } = useRegistrationData();
    const { teachers } = useSchoolData();

    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [entriesBySessionId, setEntriesBySessionId] = useState<Record<string, AttendanceEntry>>({});
    const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSchemaMissing, setIsSchemaMissing] = useState(false);

    const studentProfile = useMemo(
        () => students.find((student) => student.id === user?.id) || null,
        [students, user?.id]
    );

    const registerClass = useMemo(
        () => registerClasses.find((item) => item.id === studentProfile?.registerClassId) || null,
        [registerClasses, studentProfile?.registerClassId]
    );

    const grade = useMemo(
        () => grades.find((item) => item.id === studentProfile?.gradeId) || null,
        [grades, studentProfile?.gradeId]
    );

    const classTeacher = useMemo(
        () => teachers.find((teacher) => teacher.id === registerClass?.classTeacherId) || null,
        [teachers, registerClass?.classTeacherId]
    );

    const loadRegisterData = async () => {
        if (!registerClass?.id || !user?.id) {
            setSessions([]);
            setEntriesBySessionId({});
            setTimetableSlots([]);
            return;
        }

        setIsLoading(true);
        setIsSchemaMissing(false);

        const [sessionsRes, slotsRes] = await Promise.all([
            supabase
                .from("register_attendance_sessions")
                .select("*")
                .eq("register_class_id", registerClass.id)
                .order("attendance_date", { ascending: false })
                .limit(60),
            supabase
                .from("register_timetable_slots")
                .select("*")
                .eq("register_class_id", registerClass.id)
                .order("day_of_week", { ascending: true })
                .order("start_time", { ascending: true }),
        ]);

        if (sessionsRes.error || slotsRes.error) {
            console.error("Failed to load student register data", {
                sessionsError: sessionsRes.error,
                slotsError: slotsRes.error,
            });

            if (isSchemaMissingError(sessionsRes.error) || isSchemaMissingError(slotsRes.error)) {
                setIsSchemaMissing(true);
            } else {
                toast.error("Could not load register details");
            }

            setSessions([]);
            setEntriesBySessionId({});
            setTimetableSlots([]);
            setIsLoading(false);
            return;
        }

        const nextSessions: AttendanceSession[] = (sessionsRes.data || []).map((session) => ({
            id: session.id,
            attendanceDate: session.attendance_date,
            status: session.status || "open",
        }));

        const nextSlots: TimetableSlot[] = (slotsRes.data || []).map((slot) => ({
            id: slot.id,
            dayOfWeek: Number(slot.day_of_week),
            periodLabel: slot.period_label,
            startTime: slot.start_time,
            endTime: slot.end_time,
            activityTitle: slot.activity_title,
            location: slot.location,
            notes: slot.notes,
        }));

        setSessions(nextSessions);
        setTimetableSlots(nextSlots);

        if (nextSessions.length === 0) {
            setEntriesBySessionId({});
            setIsLoading(false);
            return;
        }

        const sessionIds = nextSessions.map((session) => session.id);
        const entriesRes = await supabase
            .from("register_attendance_entries")
            .select("*")
            .eq("student_id", user.id)
            .in("session_id", sessionIds);

        if (entriesRes.error) {
            console.error("Failed to load attendance entries", entriesRes.error);

            if (isSchemaMissingError(entriesRes.error)) {
                setIsSchemaMissing(true);
            } else {
                toast.error("Could not load attendance history");
            }

            setEntriesBySessionId({});
            setIsLoading(false);
            return;
        }

        const nextEntriesBySessionId = (entriesRes.data || []).reduce<Record<string, AttendanceEntry>>((acc, row) => {
            acc[row.session_id] = {
                id: row.id,
                sessionId: row.session_id,
                mark: row.mark as AttendanceMark,
                note: row.note,
            };
            return acc;
        }, {});

        setEntriesBySessionId(nextEntriesBySessionId);
        setIsLoading(false);
    };

    useEffect(() => {
        void loadRegisterData();
    }, [registerClass?.id, user?.id]);

    const attendanceCounts = useMemo(() => {
        const values = Object.values(entriesBySessionId);
        const present = values.filter((entry) => entry.mark === "present").length;
        const absent = values.filter((entry) => entry.mark === "absent").length;
        const late = values.filter((entry) => entry.mark === "late").length;
        const excused = values.filter((entry) => entry.mark === "excused").length;
        const unmarked = Math.max(sessions.length - values.length, 0);
        return { present, absent, late, excused, unmarked };
    }, [entriesBySessionId, sessions.length]);

    const groupedSlots = useMemo(() => {
        return DAY_OPTIONS.map((day) => ({
            ...day,
            slots: timetableSlots.filter((slot) => slot.dayOfWeek === day.value),
        }));
    }, [timetableSlots]);

    if (!studentProfile) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Register Class</h1>
                    <p className="text-muted-foreground">View your register attendance and timetable details.</p>
                </div>
                <Card className="border-muted/20 bg-card/70">
                    <CardContent className="py-16 text-center text-muted-foreground">
                        Your student profile is still loading. Please refresh in a moment.
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!studentProfile.registerClassId) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Register Class</h1>
                    <p className="text-muted-foreground">View your register attendance and timetable details.</p>
                </div>
                <Card className="border-muted/20 bg-card/70">
                    <CardContent className="py-16 text-center space-y-2">
                        <p className="font-semibold">No register class has been assigned to you yet.</p>
                        <p className="text-sm text-muted-foreground">
                            Your profile can stay active without a register class. This page will unlock automatically once assigned.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!registerClass) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">Register Class</h1>
                    <p className="text-muted-foreground">View your register attendance and timetable details.</p>
                </div>
                <Card className="border-muted/20 bg-card/70">
                    <CardContent className="py-16 text-center text-muted-foreground">
                        Your register class record is unavailable right now. Please contact administration.
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
                        <h1 className="text-4xl font-black tracking-tight">Register Class</h1>
                        <HelpIcon
                            title="Register Class Overview"
                            description="This page shows your register attendance history and timetable."
                            details={[
                                "Your class teacher marks attendance daily in the teacher portal.",
                                "If your class teacher is not assigned yet, attendance and timetable updates may be delayed.",
                            ]}
                        />
                    </div>
                    <p className="text-muted-foreground">Track your daily attendance marks and class timetable schedule.</p>
                </div>
                <Button variant="outline" onClick={() => void loadRegisterData()} disabled={isLoading}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card className="border-muted/20 bg-card/70">
                <CardContent className="pt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Register Class</p>
                        <p className="mt-1 text-xl font-black">{registerClass.name}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grade</p>
                        <p className="mt-1 text-xl font-black">{grade?.name || "Not set"}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Class Teacher</p>
                        <p className="mt-1 text-xl font-black">{classTeacher?.name || "Pending assignment"}</p>
                    </div>
                </CardContent>
            </Card>

            {!classTeacher ? (
                <Card className="border-amber-200 bg-amber-50/80">
                    <CardContent className="py-4 text-sm text-amber-900">
                        Your register class does not have an assigned class teacher yet. Attendance records may remain unmarked until assignment.
                    </CardContent>
                </Card>
            ) : null}

            {isSchemaMissing ? (
                <Card className="border-amber-200 bg-amber-50/80">
                    <CardContent className="py-4 text-sm text-amber-900">
                        Register attendance tables are not available yet. Please ask your administrator to run the register attendance migration.
                    </CardContent>
                </Card>
            ) : null}

            <Card className="border-muted/20 bg-card/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarCheck2 className="h-5 w-5 text-primary" />
                        Attendance Summary
                    </CardTitle>
                    <CardDescription>Based on your recorded register entries.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 grid-cols-2 md:grid-cols-5">
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
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unmarked</p>
                        <p className="mt-1 text-2xl font-black">{attendanceCounts.unmarked}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-muted/20 bg-card/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserRound className="h-5 w-5 text-primary" />
                        Attendance History
                    </CardTitle>
                    <CardDescription>Daily register records for your class.</CardDescription>
                </CardHeader>
                <CardContent className="rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="font-black">Date</TableHead>
                                <TableHead className="font-black">Session Status</TableHead>
                                <TableHead className="font-black">Your Mark</TableHead>
                                <TableHead className="font-black">Note</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((session) => {
                                const entry = entriesBySessionId[session.id];
                                return (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-semibold">{session.attendanceDate}</TableCell>
                                        <TableCell>
                                            <Badge variant={session.status === "closed" ? "secondary" : "outline"}>
                                                {session.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    entry?.mark === "present"
                                                        ? "border-emerald-300 text-emerald-700"
                                                        : entry?.mark === "absent"
                                                            ? "border-rose-300 text-rose-700"
                                                            : entry?.mark === "late"
                                                                ? "border-amber-300 text-amber-700"
                                                                : entry?.mark === "excused"
                                                                    ? "border-blue-300 text-blue-700"
                                                                    : ""
                                                }
                                            >
                                                {formatMark(entry?.mark)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{entry?.note || "-"}</TableCell>
                                    </TableRow>
                                );
                            })}
                            {sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No attendance sessions have been created for this register class yet.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="border-muted/20 bg-card/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock3 className="h-5 w-5 text-primary" />
                        Weekly Timetable
                    </CardTitle>
                    <CardDescription>Administrative class schedule for your register class.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {groupedSlots.map((day) => (
                            <div key={day.value} className="rounded-xl border p-3 space-y-2">
                                <h3 className="font-black">{day.label}</h3>
                                {day.slots.length > 0 ? (
                                    day.slots.map((slot) => (
                                        <div key={slot.id} className="rounded-lg border bg-background p-3">
                                            <p className="font-bold">{slot.periodLabel}</p>
                                            <p className="text-sm">{slot.activityTitle}</p>
                                            <p className="text-xs text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                                            {slot.location ? <p className="text-xs text-muted-foreground">Room: {slot.location}</p> : null}
                                            {slot.notes ? <p className="text-xs text-muted-foreground">Notes: {slot.notes}</p> : null}
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

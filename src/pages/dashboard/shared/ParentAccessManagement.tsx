import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCopy, KeyRound, RefreshCw, ShieldCheck, Smartphone, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import {
    formatParentAccessKey,
    generateParentAccessKey,
    getParentAccessKeys,
    revokeParentAccessKey,
    type GeneratedParentAccessKey,
    type ParentAccessKeyRow,
    type ParentAccessStatus,
} from "@/lib/parent-access";

const statusClassNames: Record<ParentAccessStatus, string> = {
    active: "bg-emerald-600 text-white",
    claimed: "bg-blue-600 text-white",
    expired: "bg-amber-500 text-white",
    revoked: "bg-slate-500 text-white",
};

function formatDate(value?: string | null) {
    if (!value) return "Not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Not set";
    return parsed.toLocaleDateString();
}

export default function ParentAccessManagement() {
    const { user, role } = useAuth();
    const { students, registerClasses } = useRegistrationData();
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [expiresInDays, setExpiresInDays] = useState(14);
    const [keys, setKeys] = useState<ParentAccessKeyRow[]>([]);
    const [latestKey, setLatestKey] = useState<GeneratedParentAccessKey | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const currentRole = role as string | null;
    const teacherRegisterClassIds = useMemo(
        () => registerClasses
            .filter((registerClass) => registerClass.classTeacherId === user?.id)
            .map((registerClass) => registerClass.id),
        [registerClasses, user?.id]
    );

    const manageableStudents = useMemo(() => {
        if (currentRole === "principal" || currentRole === "admin") {
            return students;
        }

        if (currentRole === "teacher" || currentRole === "register-teacher") {
            return students.filter((student) => student.registerClassId && teacherRegisterClassIds.includes(student.registerClassId));
        }

        return [];
    }, [currentRole, students, teacherRegisterClassIds]);

    const canManageParentAccess = manageableStudents.length > 0 || currentRole === "principal" || currentRole === "admin";

    const loadKeys = useCallback(async () => {
        setIsLoading(true);
        try {
            const nextKeys = await getParentAccessKeys();
            setKeys(nextKeys);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not load parent access keys";
            toast.error(message);
            setKeys([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadKeys();
    }, [loadKeys]);

    useEffect(() => {
        const selectedStudentStillAvailable = manageableStudents.some((student) => student.id === selectedStudentId);
        if ((!selectedStudentId || !selectedStudentStillAvailable) && manageableStudents.length > 0) {
            setSelectedStudentId(manageableStudents[0].id);
        }
    }, [manageableStudents, selectedStudentId]);

    const selectedStudent = manageableStudents.find((student) => student.id === selectedStudentId) || null;

    const handleGenerate = async () => {
        if (!selectedStudentId) {
            toast.error("Choose a learner first.");
            return;
        }

        setIsGenerating(true);
        try {
            const generated = await generateParentAccessKey(selectedStudentId, expiresInDays);
            setLatestKey(generated);
            toast.success("Parent access key generated.");
            await loadKeys();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not generate parent access key";
            toast.error(message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyLatestKey = async () => {
        if (!latestKey) return;
        await navigator.clipboard.writeText(latestKey.accessKey);
        toast.success("Access key copied.");
    };

    const handleRevoke = async (accessKeyId: string) => {
        setRevokingId(accessKeyId);
        try {
            await revokeParentAccessKey(accessKeyId);
            toast.success("Parent access key revoked.");
            await loadKeys();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not revoke parent access key";
            toast.error(message);
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <KeyRound className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Parent Access</h1>
                        <p className="text-muted-foreground">
                            Generate one-time keys that parents use to connect the mobile app to a learner.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Staff controlled
                        </CardTitle>
                        <CardDescription>Only authorized school staff can create or revoke keys.</CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-primary" />
                            Mobile first
                        </CardTitle>
                        <CardDescription>Parents enter the key in the mobile app and confirm their learner.</CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-primary" />
                            Linked profile
                        </CardTitle>
                        <CardDescription>Claimed keys create a parent profile linked to the learner.</CardDescription>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create parent access key</CardTitle>
                    <CardDescription>
                        Share the generated key privately with the learner's parent or guardian. It is shown only once.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!canManageParentAccess ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            No learners are available for your role. Register teachers can generate keys for learners in their register class.
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-[1fr_160px_auto]">
                                <div className="space-y-2">
                                    <Label>Learner</Label>
                                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose learner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {manageableStudents.map((student) => (
                                                <SelectItem key={student.id} value={student.id}>
                                                    {student.name || `${student.firstName} ${student.lastName}`} {student.studentClass ? `(${student.studentClass})` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Expires in days</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={60}
                                        value={expiresInDays}
                                        onChange={(event) => setExpiresInDays(Number(event.target.value) || 14)}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button onClick={handleGenerate} disabled={isGenerating || !selectedStudentId}>
                                        {isGenerating ? "Generating..." : "Generate Key"}
                                    </Button>
                                </div>
                            </div>

                            {selectedStudent ? (
                                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                                    <div className="font-semibold">{selectedStudent.name || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</div>
                                    <div className="text-muted-foreground">
                                        {selectedStudent.grade || "No grade"} · {selectedStudent.studentClass || "No register class"} · {selectedStudent.administrationNumber || "No admin no."}
                                    </div>
                                </div>
                            ) : null}

                            {latestKey ? (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                    <div className="text-sm font-semibold text-emerald-950">Share this key with the parent</div>
                                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="font-mono text-3xl font-black tracking-widest text-emerald-950">
                                            {formatParentAccessKey(latestKey.accessKey)}
                                        </div>
                                        <Button variant="outline" onClick={copyLatestKey}>
                                            <ClipboardCopy className="mr-2 h-4 w-4" />
                                            Copy
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-sm text-emerald-900">
                                        Expires {formatDate(latestKey.expiresAt)}. The parent will enter it on the first mobile app screen.
                                    </p>
                                </div>
                            ) : null}
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Access-key history</CardTitle>
                        <CardDescription>Track generated, claimed, expired, and revoked parent keys.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={loadKeys} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Learner</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Claimed by</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {keys.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {isLoading ? "Loading parent access keys..." : "No parent access keys generated yet."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell>
                                            <div className="font-semibold">{key.studentFullName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {key.gradeLabel || "No grade"} · {key.classLabel || "No class"} · {key.administrationNumber || "No admin no."}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusClassNames[key.status]}>{key.status}</Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(key.createdAt)}</TableCell>
                                        <TableCell>{formatDate(key.expiresAt)}</TableCell>
                                        <TableCell>{key.claimedByName || "Not claimed"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRevoke(key.id)}
                                                disabled={key.status !== "active" || revokingId === key.id}
                                            >
                                                {revokingId === key.id ? "Revoking..." : "Revoke"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BookOpenCheck, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useHomeworkAlerts, type HomeworkAlert, type HomeworkAlertStatus } from "@/context/HomeworkAlertsContext";
import { useSubjects } from "@/hooks/useSubjects";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { useAuth } from "@/context/AuthContext";

const isoToday = () => new Date().toISOString().slice(0, 10);
type FormState = { subjectId: string; subjectClassId: string; title: string; instructions: string; textbookReference: string; assignedDate: string; dueDate: string; status: HomeworkAlertStatus };
const emptyForm = (): FormState => ({ subjectId: "", subjectClassId: "", title: "", instructions: "", textbookReference: "", assignedDate: isoToday(), dueDate: "", status: "published" });

export default function HomeworkAlerts() {
  const { user } = useAuth();
  const { alerts, createAlert, updateAlert, deleteAlert } = useHomeworkAlerts();
  const { subjects } = useSubjects();
  const { subjectClasses } = useRegistrationData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkAlert | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const availableClasses = useMemo(() => subjectClasses.filter((item) => item.teacherId === user?.id), [subjectClasses, user?.id]);
  const subjectName = (id: string) => subjects.find((item) => item.id === id)?.name || "Subject";
  const className = (id: string | null) => availableClasses.find((item) => item.id === id)?.name || "All subject learners";

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const startEdit = (alert: HomeworkAlert) => {
    setEditing(alert);
    setForm({ subjectId: alert.subjectId, subjectClassId: alert.subjectClassId || "all", title: alert.title, instructions: alert.instructions, textbookReference: alert.textbookReference || "", assignedDate: alert.assignedDate, dueDate: alert.dueDate, status: alert.status });
    setOpen(true);
  };
  const save = async (requestedStatus = form.status) => {
    if (!form.subjectId || !form.instructions.trim() || !form.dueDate) { toast.error("Choose a subject, add instructions, and select a due date."); return; }
    if (form.dueDate < form.assignedDate) { toast.error("The due date must be on or after the assigned date."); return; }
    setSaving(true);
    const payload = { ...form, status: requestedStatus, title: form.title.trim() || form.instructions.trim().split("\n")[0].slice(0, 80), subjectClassId: form.subjectClassId === "all" ? null : form.subjectClassId, textbookReference: form.textbookReference.trim() || null };
    try {
      if (editing) { await updateAlert(editing.id, payload); toast.success("Homework alert updated."); }
      else { await createAlert(payload); toast.success(form.status === "draft" ? "Homework draft saved." : "Homework published to learners and parents."); }
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save homework."); }
    finally { setSaving(false); }
  };
  const remove = async (alert: HomeworkAlert) => {
    if (!window.confirm(`Delete “${alert.title}”?`)) return;
    try { await deleteAlert(alert.id); toast.success("Homework alert deleted."); }
    catch { toast.error("Could not delete homework alert."); }
  };

  return <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold text-primary">Paper-based learning</p><h1 className="text-3xl font-bold tracking-tight">Homework alerts</h1><p className="mt-1 text-muted-foreground">A simple reminder for learners and parents — no submissions or marking.</p></div>
      <Button onClick={startCreate} className="gap-2"><Plus className="h-4 w-4" /> Create homework</Button>
    </div>
    <div className="grid gap-4">
      {alerts.map((alert) => <Card key={alert.id} className="overflow-hidden">
        <CardHeader className="space-y-3 pb-3"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="mb-2 flex flex-wrap gap-2"><Badge variant="secondary">{subjectName(alert.subjectId)}</Badge><Badge variant="outline">{className(alert.subjectClassId)}</Badge>{alert.status === "draft" && <Badge variant="outline">Draft</Badge>}</div><CardTitle>{alert.title}</CardTitle></div><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => startEdit(alert)} aria-label="Edit homework"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove(alert)} aria-label="Delete homework"><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>
          <CardDescription className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Due {format(new Date(`${alert.dueDate}T12:00:00`), "EEEE, d MMMM")}</CardDescription></CardHeader>
        <CardContent className="space-y-3"><p className="whitespace-pre-wrap text-sm leading-6">{alert.instructions}</p>{alert.textbookReference && <p className="rounded-lg bg-muted px-3 py-2 text-sm"><span className="font-semibold">Textbook / workbook: </span>{alert.textbookReference}</p>}</CardContent>
      </Card>)}
      {alerts.length === 0 && <Card className="border-dashed"><CardContent className="flex flex-col items-center py-16 text-center"><BookOpenCheck className="mb-3 h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">No homework alerts yet</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">Create an alert when learners need to complete work in a textbook, workbook, or on paper.</p><Button className="mt-5" onClick={startCreate}>Create homework</Button></CardContent></Card>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Edit homework" : "Create homework"}</DialogTitle><DialogDescription>Only the essentials are required. Learners and their parents see published homework automatically.</DialogDescription></DialogHeader><div className="grid gap-4 py-2">
      <div className="grid gap-2"><Label>Class and subject</Label><Select value={form.subjectClassId} onValueChange={(value) => { const selected = availableClasses.find((item) => item.id === value); setForm((current) => ({ ...current, subjectClassId: value, subjectId: selected?.subjectId || current.subjectId })); }}><SelectTrigger className="w-full"><SelectValue placeholder="Select a class" /></SelectTrigger><SelectContent>{availableClasses.map((item) => <SelectItem key={item.id} value={item.id}>{subjectName(item.subjectId)} · {item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-2"><Label htmlFor="homework-title">Title <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="homework-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Fractions practice" /></div>
      <div className="grid gap-2"><Label htmlFor="homework-instructions">Instructions</Label><Textarea id="homework-instructions" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Complete questions 1–10 in your workbook." rows={4} /></div>
      <div className="grid gap-2"><Label htmlFor="textbook">Textbook / pages <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="textbook" value={form.textbookReference} onChange={(event) => setForm({ ...form, textbookReference: event.target.value })} placeholder="Mathematics Today, pages 42–43" /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="assigned-date">Assigned date</Label><Input id="assigned-date" type="date" value={form.assignedDate} onChange={(event) => setForm({ ...form, assignedDate: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="due-date">Due date</Label><Input id="due-date" type="date" min={form.assignedDate} value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div></div>
    </div><DialogFooter><Button variant="outline" onClick={() => void save("draft")} disabled={saving}>Save draft</Button><Button onClick={() => void save("published")} disabled={saving}>{saving ? "Publishing..." : editing ? "Save changes" : "Publish homework"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

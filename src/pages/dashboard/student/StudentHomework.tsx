import { format } from "date-fns";
import { BookOpenCheck, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHomeworkAlerts } from "@/context/HomeworkAlertsContext";
import { useSubjects } from "@/hooks/useSubjects";

export default function StudentHomework() {
  const { alerts } = useHomeworkAlerts(); const { subjects } = useSubjects();
  const subjectName = (id: string) => subjects.find((item) => item.id === id)?.name || "Subject";
  const today = new Date().toISOString().slice(0, 10);
  const published = alerts.filter((alert) => alert.status === "published");
  return <div className="mx-auto w-full max-w-4xl space-y-6 pb-10"><div><p className="text-sm font-semibold text-primary">Keep on track</p><h1 className="text-3xl font-bold tracking-tight">Homework</h1><p className="mt-1 text-muted-foreground">Paper-based homework from your teachers. Your parent or guardian can see this too.</p></div>
    <div className="grid gap-4">{published.map((alert) => { const pastDue = alert.dueDate < today; return <Card key={alert.id}><CardHeader className="pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex gap-2"><Badge variant="secondary">{subjectName(alert.subjectId)}</Badge>{pastDue && <Badge variant="outline" className="text-destructive">Past due</Badge>}</div><CardTitle>{alert.title}</CardTitle></div><CardDescription className="flex shrink-0 items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Due {format(new Date(`${alert.dueDate}T12:00:00`), "d MMMM")}</CardDescription></div></CardHeader><CardContent className="space-y-3"><p className="whitespace-pre-wrap text-sm leading-6">{alert.instructions}</p>{alert.textbookReference && <div className="rounded-lg bg-muted px-3 py-2 text-sm"><span className="font-semibold">Textbook / workbook: </span>{alert.textbookReference}</div>}</CardContent></Card>; })}
      {published.length === 0 && <Card className="border-dashed"><CardContent className="flex flex-col items-center py-16 text-center"><BookOpenCheck className="mb-3 h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">No homework right now</h2><p className="mt-1 text-sm text-muted-foreground">New homework from your teachers will appear here.</p></CardContent></Card>}</div>
  </div>;
}

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import supabase from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type HomeworkAlertStatus = "draft" | "published";

export interface HomeworkAlert {
  id: string;
  subjectId: string;
  subjectClassId: string | null;
  createdBy: string;
  title: string;
  instructions: string;
  textbookReference: string | null;
  assignedDate: string;
  dueDate: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  status: HomeworkAlertStatus;
  createdAt: string;
}

type HomeworkAlertInput = Pick<HomeworkAlert, "subjectId" | "subjectClassId" | "title" | "instructions" | "textbookReference" | "assignedDate" | "dueDate" | "status">;

interface HomeworkAlertsContextValue {
  alerts: HomeworkAlert[];
  loading: boolean;
  createAlert: (alert: HomeworkAlertInput) => Promise<HomeworkAlert>;
  updateAlert: (id: string, alert: Partial<HomeworkAlertInput>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

const HomeworkAlertsContext = createContext<HomeworkAlertsContextValue | undefined>(undefined);

const mapAlert = (row: any): HomeworkAlert => ({
  id: row.id, subjectId: row.subject_id, subjectClassId: row.subject_class_id,
  createdBy: row.created_by, title: row.title, instructions: row.instructions,
  textbookReference: row.textbook_reference, assignedDate: row.assigned_date,
  dueDate: row.due_date, attachmentUrl: row.attachment_url, attachmentName: row.attachment_name,
  status: row.status, createdAt: row.created_at,
});

export function HomeworkAlertsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<HomeworkAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAlerts = async () => {
    if (!user) { setAlerts([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("homework_alerts").select("*").order("due_date", { ascending: true });
    if (error) console.error("Could not load homework alerts", error);
    else setAlerts((data || []).map(mapAlert));
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) void refreshAlerts(); }, [user?.id, authLoading]);

  const createAlert = async (alert: HomeworkAlertInput) => {
    const { data, error } = await supabase.from("homework_alerts").insert({
      subject_id: alert.subjectId, subject_class_id: alert.subjectClassId || null, title: alert.title,
      instructions: alert.instructions, textbook_reference: alert.textbookReference || null,
      assigned_date: alert.assignedDate, due_date: alert.dueDate, status: alert.status,
    }).select().single();
    if (error) throw error;
    const mapped = mapAlert(data); setAlerts((items) => [mapped, ...items]); return mapped;
  };

  const updateAlert = async (id: string, alert: Partial<HomeworkAlertInput>) => {
    const update: Record<string, unknown> = {};
    if (alert.subjectId !== undefined) update.subject_id = alert.subjectId;
    if (alert.subjectClassId !== undefined) update.subject_class_id = alert.subjectClassId;
    if (alert.title !== undefined) update.title = alert.title;
    if (alert.instructions !== undefined) update.instructions = alert.instructions;
    if (alert.textbookReference !== undefined) update.textbook_reference = alert.textbookReference;
    if (alert.assignedDate !== undefined) update.assigned_date = alert.assignedDate;
    if (alert.dueDate !== undefined) update.due_date = alert.dueDate;
    if (alert.status !== undefined) update.status = alert.status;
    const { data, error } = await supabase.from("homework_alerts").update(update).eq("id", id).select().single();
    if (error) throw error;
    const mapped = mapAlert(data); setAlerts((items) => items.map((item) => item.id === id ? mapped : item));
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase.from("homework_alerts").delete().eq("id", id);
    if (error) throw error;
    setAlerts((items) => items.filter((item) => item.id !== id));
  };

  return <HomeworkAlertsContext.Provider value={{ alerts, loading, createAlert, updateAlert, deleteAlert, refreshAlerts }}>{children}</HomeworkAlertsContext.Provider>;
}

export function useHomeworkAlerts() {
  const context = useContext(HomeworkAlertsContext);
  if (!context) throw new Error("useHomeworkAlerts must be used within HomeworkAlertsProvider");
  return context;
}

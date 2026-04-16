import { Bell, BookOpen, ClipboardCheck, FileCheck2, FileText, MessageSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationItem } from "@/types/notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getIcon(notification: NotificationItem) {
  switch (notification.category) {
    case "assessment":
      return ClipboardCheck;
    case "quiz":
      return FileCheck2;
    case "content":
      return BookOpen;
    case "discussion":
      return MessageSquare;
    case "grading":
    case "submission":
      return FileText;
    default:
      return Sparkles;
  }
}

export default function NotificationsPage() {
  const { notifications } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Notifications</h1>
        <p className="text-muted-foreground">Everything is listed from newest to oldest across your dashboard activity.</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-card/70">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No notifications yet.</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = getIcon(notification);
                return (
                  <Link
                    key={notification.id}
                    to={notification.href}
                    className="flex items-start gap-4 px-5 py-4 transition hover:bg-primary/5"
                  >
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{notification.title}</p>
                        {notification.subjectName ? (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                            {notification.subjectName}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                    </div>
                    <p className="shrink-0 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {format(new Date(notification.createdAt), "dd MMM yyyy, HH:mm")}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

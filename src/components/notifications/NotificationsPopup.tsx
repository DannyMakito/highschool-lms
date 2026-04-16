import { Bell, BookOpen, ClipboardCheck, FileCheck2, FileText, MessageSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { getRolePathPrefix } from "@/lib/role-path";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import type { NotificationItem } from "@/types/notifications";

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

export function NotificationsPopup() {
  const { role } = useAuth();
  const { popupNotifications, popupVisible, dismissPopup } = useNotifications();
  const rolePrefix = getRolePathPrefix(role);

  if (!popupVisible || popupNotifications.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-50 w-[min(92vw,420px)]">
      <Card className="border-primary/20 shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" />
              Recent Notifications
            </CardTitle>
            <div className="flex items-center gap-2">
              <Link to={`${rolePrefix}/notifications`} onClick={dismissPopup}>
                <Button size="sm" variant="outline">View all</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={dismissPopup}>Dismiss</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {popupNotifications.map((notification) => {
            const Icon = getIcon(notification);
            return (
              <Link
                key={notification.id}
                to={notification.href}
                onClick={dismissPopup}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-3 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

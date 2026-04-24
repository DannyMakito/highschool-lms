import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ExternalLink, MessageSquareText, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import supabase from "@/lib/supabase";

type FeedbackFormConfigRow = {
    id: string;
    form_url: string;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    target_roles: string[] | null;
    target_portals: string[] | null;
    form_version: string | null;
    title: string | null;
    description: string | null;
};

type FeedbackPromptEventRow = {
    id: string;
    user_id: string;
    week_key: string;
    role: string;
    portal: string;
    form_version: string | null;
    shown_count: number;
    first_shown_at: string | null;
    last_shown_at: string | null;
    clicked_at: string | null;
    snoozed_until: string | null;
    skipped_at: string | null;
    submitted_confirmed_at: string | null;
};

const DEFAULT_TIMEZONE = import.meta.env.VITE_WEEKLY_FEEDBACK_TIMEZONE || "Africa/Johannesburg";
const DEFAULT_FALLBACK_FORM_URL = import.meta.env.VITE_WEEKLY_FEEDBACK_FORM_URL || "";
const REOPEN_THROTTLE_MS = 2 * 60 * 60 * 1000;
const REMIND_LATER_HOURS = 4;
const POST_CLICK_SNOOZE_MINUTES = 30;

const isMissingTableError = (error: any) => {
    const code = error?.code || "";
    const message = String(error?.message || "").toLowerCase();
    return code === "PGRST205" || code === "42P01" || message.includes("does not exist");
};

const toIsoString = (date: Date) => date.toISOString();

const addHoursIso = (hours: number) => toIsoString(new Date(Date.now() + hours * 60 * 60 * 1000));
const addMinutesIso = (minutes: number) => toIsoString(new Date(Date.now() + minutes * 60 * 1000));

function getTimezoneParts(timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
    }).formatToParts(new Date());

    const byType = parts.reduce<Record<string, string>>((acc, part) => {
        if (part.type !== "literal") {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    const year = Number(byType.year || "0");
    const month = Number(byType.month || "0");
    const day = Number(byType.day || "0");
    const weekday = byType.weekday || "";

    return {
        year,
        month,
        day,
        weekday,
        dateKey: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
}

function getIsoWeekKey(timeZone: string) {
    const parts = getTimezoneParts(timeZone);
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function normalizeRole(role: string) {
    const value = role.toLowerCase().trim();
    if (value === "student") return "learner";
    return value;
}

function normalizePortal(portal: string) {
    const value = portal.toLowerCase().trim();
    if (value === "learner") return "student";
    return value;
}

function getPortalFromPath(pathname: string) {
    if (pathname.startsWith("/student")) return "student";
    if (pathname.startsWith("/teacher")) return "teacher";
    if (pathname.startsWith("/principal")) return "principal";
    return "unknown";
}

function dateIsInRange(dateKey: string, startDate: string | null, endDate: string | null) {
    if (startDate && dateKey < startDate) return false;
    if (endDate && dateKey > endDate) return false;
    return true;
}

export function WeeklyFeedbackPrompt() {
    const { user } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [config, setConfig] = useState<FeedbackFormConfigRow | null>(null);
    const [eventRow, setEventRow] = useState<FeedbackPromptEventRow | null>(null);
    const [trackingEnabled, setTrackingEnabled] = useState(true);

    const checkInFlightRef = useRef(false);

    const portal = useMemo(() => getPortalFromPath(location.pathname), [location.pathname]);
    const weekKey = useMemo(() => getIsoWeekKey(DEFAULT_TIMEZONE), []);
    const isFriday = useMemo(() => getTimezoneParts(DEFAULT_TIMEZONE).weekday.toLowerCase().startsWith("fri"), []);
    const dateKey = useMemo(() => getTimezoneParts(DEFAULT_TIMEZONE).dateKey, []);

    const fetchActiveFormConfig = useCallback(async () => {
        const fallbackConfig = DEFAULT_FALLBACK_FORM_URL
            ? {
                id: "env-config",
                form_url: DEFAULT_FALLBACK_FORM_URL,
                is_active: true,
                start_date: null,
                end_date: null,
                target_roles: ["learner", "teacher", "principal"],
                target_portals: ["student", "teacher", "principal"],
                form_version: "v1",
                title: "Weekly System Feedback",
                description: "Rate your experience out of 10 and share suggestions.",
            }
            : null;

        const { data, error } = await supabase
            .from("feedback_form_config")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            if (!isMissingTableError(error)) {
                console.error("Failed to load feedback form config", error);
            }
            return fallbackConfig;
        }

        if (!data) {
            return fallbackConfig;
        }

        const row = data as FeedbackFormConfigRow;
        if (!dateIsInRange(dateKey, row.start_date, row.end_date)) {
            return fallbackConfig;
        }

        return row;
    }, [dateKey]);

    const upsertEventRow = useCallback(
        async (updates: Partial<FeedbackPromptEventRow>) => {
            if (!user?.id || !config) return null;
            if (!trackingEnabled) return null;

            const payload = {
                user_id: user.id,
                week_key: weekKey,
                role: user.role || "unknown",
                portal,
                form_version: config.form_version || "v1",
                ...updates,
            };

            const { data, error } = await supabase
                .from("feedback_prompt_events")
                .upsert(payload, { onConflict: "user_id,week_key" })
                .select("*")
                .single();

            if (error) {
                if (isMissingTableError(error)) {
                    setTrackingEnabled(false);
                    return null;
                }
                console.error("Failed to upsert feedback prompt event", error);
                return null;
            }

            const row = data as FeedbackPromptEventRow;
            setEventRow(row);
            return row;
        },
        [config, portal, trackingEnabled, user?.id, user?.role, weekKey]
    );

    const markPromptShown = useCallback(
        async (existing: FeedbackPromptEventRow | null) => {
            if (!user?.id || !config || !trackingEnabled) return;

            const now = new Date().toISOString();

            if (existing?.id) {
                const { data, error } = await supabase
                    .from("feedback_prompt_events")
                    .update({
                        shown_count: (existing.shown_count || 0) + 1,
                        first_shown_at: existing.first_shown_at || now,
                        last_shown_at: now,
                        role: user.role || "unknown",
                        portal,
                        form_version: config.form_version || "v1",
                    })
                    .eq("id", existing.id)
                    .select("*")
                    .single();

                if (error) {
                    if (isMissingTableError(error)) {
                        setTrackingEnabled(false);
                        return;
                    }
                    console.error("Failed to update shown event", error);
                    return;
                }

                setEventRow(data as FeedbackPromptEventRow);
                return;
            }

            await upsertEventRow({
                shown_count: 1,
                first_shown_at: now,
                last_shown_at: now,
            });
        },
        [config, portal, trackingEnabled, upsertEventRow, user?.id, user?.role]
    );

    const evaluatePrompt = useCallback(async () => {
        if (!user?.id || !user.role) {
            setIsOpen(false);
            return;
        }

        if (checkInFlightRef.current) return;
        checkInFlightRef.current = true;

        try {
            const activeConfig = await fetchActiveFormConfig();
            setConfig(activeConfig);

            if (!activeConfig?.form_url) {
                setIsOpen(false);
                return;
            }

            if (!isFriday) {
                setIsOpen(false);
                return;
            }

            const role = normalizeRole(user.role);
            const configRoles = (activeConfig.target_roles || []).map(normalizeRole);
            if (configRoles.length > 0 && !configRoles.includes(role)) {
                setIsOpen(false);
                return;
            }

            const configPortals = (activeConfig.target_portals || []).map(normalizePortal);
            if (configPortals.length > 0 && !configPortals.includes(normalizePortal(portal))) {
                setIsOpen(false);
                return;
            }

            const { data, error } = await supabase
                .from("feedback_prompt_events")
                .select("*")
                .eq("user_id", user.id)
                .eq("week_key", weekKey)
                .maybeSingle();

            let currentEvent: FeedbackPromptEventRow | null = null;

            if (error) {
                if (isMissingTableError(error)) {
                    setTrackingEnabled(false);
                } else {
                    console.error("Failed to fetch feedback prompt event", error);
                    setIsOpen(false);
                    return;
                }
            } else {
                currentEvent = (data as FeedbackPromptEventRow | null) || null;
                setEventRow(currentEvent);
            }

            if (currentEvent?.submitted_confirmed_at || currentEvent?.skipped_at) {
                setIsOpen(false);
                return;
            }

            const nowMs = Date.now();

            if (currentEvent?.snoozed_until && new Date(currentEvent.snoozed_until).getTime() > nowMs) {
                setIsOpen(false);
                return;
            }

            if (
                currentEvent?.last_shown_at &&
                nowMs - new Date(currentEvent.last_shown_at).getTime() < REOPEN_THROTTLE_MS
            ) {
                setIsOpen(false);
                return;
            }

            await markPromptShown(currentEvent);
            setIsOpen(true);
        } finally {
            checkInFlightRef.current = false;
        }
    }, [fetchActiveFormConfig, isFriday, markPromptShown, portal, user?.id, user?.role, weekKey]);

    useEffect(() => {
        void evaluatePrompt();
    }, [evaluatePrompt, location.pathname]);

    const handleOpenFeedbackForm = async () => {
        if (!config?.form_url) return;

        setIsBusy(true);
        try {
            window.open(config.form_url, "_blank", "noopener,noreferrer");
            await upsertEventRow({
                clicked_at: new Date().toISOString(),
                snoozed_until: addMinutesIso(POST_CLICK_SNOOZE_MINUTES),
            });
            toast.success("Feedback form opened in a new tab.");
            setIsOpen(false);
        } finally {
            setIsBusy(false);
        }
    };

    const handleRemindLater = async () => {
        setIsBusy(true);
        try {
            await upsertEventRow({
                snoozed_until: addHoursIso(REMIND_LATER_HOURS),
            });
            toast.message("No problem. We will remind you later today.");
            setIsOpen(false);
        } finally {
            setIsBusy(false);
        }
    };

    const handleSkipThisWeek = async () => {
        setIsBusy(true);
        try {
            await upsertEventRow({
                skipped_at: new Date().toISOString(),
                snoozed_until: null,
            });
            toast.message("You can submit feedback again next Friday.");
            setIsOpen(false);
        } finally {
            setIsBusy(false);
        }
    };

    const handleSubmitted = async () => {
        setIsBusy(true);
        try {
            await upsertEventRow({
                submitted_confirmed_at: new Date().toISOString(),
                snoozed_until: null,
            });
            toast.success("Thank you for your feedback.");
            setIsOpen(false);
        } finally {
            setIsBusy(false);
        }
    };

    const title = config?.title || "Weekly System Feedback";
    const description =
        config?.description ||
        "Please rate system functions out of 10 and share what is working or needs improvement.";

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
                className="sm:max-w-xl"
            >
                <DialogHeader className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">
                            Friday Pulse
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                            {weekKey}
                        </Badge>
                    </div>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <MessageSquareText className="h-6 w-6 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
                    <p className="font-semibold flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Suggested format
                    </p>
                    <p>Rate your experience out of `10` for usability, speed, and feature quality.</p>
                    <p>Add one short comment for what to keep and one for what to improve.</p>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => void handleRemindLater()} disabled={isBusy}>
                            Remind Me Later
                        </Button>
                        <Button variant="outline" onClick={() => void handleSkipThisWeek()} disabled={isBusy}>
                            Skip This Week
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => void handleSubmitted()} disabled={isBusy}>
                            I Submitted
                        </Button>
                        <Button onClick={() => void handleOpenFeedbackForm()} disabled={isBusy}>
                            Open Feedback Form
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default WeeklyFeedbackPrompt;

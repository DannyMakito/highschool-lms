import supabase from "@/lib/supabase";

type InsertPayload = Record<string, string | number | boolean | null>;

async function insertWithFallback(
    table: "user_sessions" | "content_interactions",
    payloads: InsertPayload[],
    context: string
): Promise<void> {
    const errors: string[] = [];

    for (const payload of payloads) {
        const { error } = await supabase.from(table).insert(payload);
        if (!error) return;
        errors.push(`${error.code || "unknown"}: ${error.message}`);
    }

    console.error(`[analytics] Failed to insert into ${table} (${context})`, { errors });
}

export async function trackLoginSession(userId: string): Promise<void> {
    const nowIso = new Date().toISOString();
    await insertWithFallback(
        "user_sessions",
        [
            { user_id: userId, login_time: nowIso },
            { user_id: userId, action: "login", created_at: nowIso },
            { user_id: userId, login_at: nowIso },
            { user_id: userId, session_start: nowIso },
            { user_id: userId, started_at: nowIso },
            { user_id: userId },
        ],
        "trackLoginSession"
    );
}

interface TrackContentInteractionParams {
    userId: string;
    lessonId: string;
    interactionType: "open" | "complete";
}

export async function trackContentInteraction({
    userId,
    lessonId,
    interactionType,
}: TrackContentInteractionParams): Promise<void> {
    const nowIso = new Date().toISOString();
    const action = interactionType === "open" ? "viewed" : "completed";
    await insertWithFallback(
        "content_interactions",
        [
            {
                user_id: userId,
                content_type: "lesson",
                content_id: lessonId,
                action,
                timestamp: nowIso,
            },
            {
                user_id: userId,
                lesson_id: lessonId,
                interaction_type: interactionType,
                created_at: nowIso,
            },
            {
                user_id: userId,
                content_id: lessonId,
                content_type: "lesson",
                interaction_type: interactionType,
                created_at: nowIso,
            },
            { user_id: userId, lesson_id: lessonId },
        ],
        "trackContentInteraction"
    );
}

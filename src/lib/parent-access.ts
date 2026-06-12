import supabase from "@/lib/supabase";

export type ParentAccessStatus = "active" | "claimed" | "expired" | "revoked";

export type ParentAccessKeyRow = {
    id: string;
    studentId: string;
    studentFullName: string;
    administrationNumber: string | null;
    gradeLabel: string | null;
    classLabel: string | null;
    createdBy: string | null;
    createdByName: string | null;
    createdAt: string;
    expiresAt: string;
    claimedBy: string | null;
    claimedByName: string | null;
    claimedAt: string | null;
    revokedAt: string | null;
    status: ParentAccessStatus;
};

export type GeneratedParentAccessKey = {
    id: string;
    accessKey: string;
    studentId: string;
    expiresAt: string;
    status: ParentAccessStatus;
};

type ParentAccessKeyRpcRow = {
    id: string;
    student_id: string;
    student_full_name: string;
    administration_number: string | null;
    grade_label: string | null;
    class_label: string | null;
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
    expires_at: string;
    claimed_by: string | null;
    claimed_by_name: string | null;
    claimed_at: string | null;
    revoked_at: string | null;
    status: ParentAccessStatus;
};

type GeneratedParentAccessKeyRpcRow = {
    id: string;
    access_key: string;
    student_id: string;
    expires_at: string;
    status: ParentAccessStatus;
};

function mapParentAccessKey(row: ParentAccessKeyRpcRow): ParentAccessKeyRow {
    return {
        id: row.id,
        studentId: row.student_id,
        studentFullName: row.student_full_name,
        administrationNumber: row.administration_number,
        gradeLabel: row.grade_label,
        classLabel: row.class_label,
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        claimedBy: row.claimed_by,
        claimedByName: row.claimed_by_name,
        claimedAt: row.claimed_at,
        revokedAt: row.revoked_at,
        status: row.status,
    };
}

export async function getParentAccessKeys() {
    const { data, error } = await supabase.rpc("get_parent_access_keys");
    if (error) throw error;
    return ((data || []) as ParentAccessKeyRpcRow[]).map(mapParentAccessKey);
}

export async function generateParentAccessKey(studentId: string, expiresInDays = 14) {
    const { data, error } = await supabase.rpc("generate_parent_access_key", {
        p_student_id: studentId,
        p_expires_in_days: expiresInDays,
    });

    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as GeneratedParentAccessKeyRpcRow | null;
    if (!row?.access_key) {
        throw new Error("Supabase did not return a parent access key.");
    }

    return {
        id: row.id,
        accessKey: row.access_key,
        studentId: row.student_id,
        expiresAt: row.expires_at,
        status: row.status,
    } satisfies GeneratedParentAccessKey;
}

export async function revokeParentAccessKey(accessKeyId: string) {
    const { error } = await supabase.rpc("revoke_parent_access_key", {
        p_access_key_id: accessKeyId,
    });

    if (error) throw error;
}

export function formatParentAccessKey(accessKey: string) {
    return accessKey.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * SpeedGrader API — All Supabase operations for the grading interface.
 * Intentionally separated from the global AssignmentsContext for performance.
 */
import supabase from '@/lib/supabase';
import type { AnnotationData, CriterionGrade, SubmissionFile } from '@/types/speedgrader';

// ═══════════════════════════════════════════════════════
// File Access
// ═══════════════════════════════════════════════════════

/** Generate a 1-hour signed URL for a submission file stored in private bucket */
export async function getSignedFileUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from('assignment-submissions')
        .createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return data.signedUrl;
}

/**
 * Resolve a submission's content to a viewable URL.
 * Handles both legacy public URLs and new storage paths.
 */
export async function resolveSubmissionUrl(content: string): Promise<string> {
    // Legacy: content is already a full public URL
    if (content.startsWith('http')) {
        return content;
    }
    // New: content is a storage path → generate signed URL
    return getSignedFileUrl(content);
}

/** Upload a file and create the submission_files metadata row */
export async function uploadSubmissionFile(
    submissionId: string,
    file: File,
    assignmentId: string,
    userId: string
): Promise<SubmissionFile> {
    const storagePath = `${assignmentId}/${userId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
        .from('assignment-submissions')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
        .from('submission_files')
        .insert({
            submission_id: submissionId,
            storage_path: storagePath,
            original_filename: file.name,
            mime_type: file.type || 'application/pdf',
            file_size_bytes: file.size,
            uploaded_by: userId,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Fetch file metadata rows for a submission */
export async function fetchSubmissionFiles(submissionId: string): Promise<SubmissionFile[]> {
    const { data, error } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', submissionId)
        .order('version', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ═══════════════════════════════════════════════════════
// Annotations CRUD
// ═══════════════════════════════════════════════════════

export async function fetchAnnotations(submissionId: string): Promise<AnnotationData[]> {
    const { data: annotations, error } = await supabase
        .from('submission_annotations')
        .select('*')
        .eq('submission_id', submissionId)
        .order('page_number', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) throw error;
    
    // Manually join profiles 
    if (annotations && annotations.length > 0) {
        const authorIds = [...new Set(annotations.map(a => a.author_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', authorIds);
            
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        
        return annotations.map(a => ({
            ...a,
            profiles: profileMap.get(a.author_id)
        })) as AnnotationData[];
    }

    return (annotations ?? []) as AnnotationData[];
}

export async function insertAnnotation(
    annotation: Omit<AnnotationData, 'id' | 'created_at' | 'updated_at' | 'profiles'>
): Promise<AnnotationData> {
    const { data, error } = await supabase
        .from('submission_annotations')
        .insert(annotation)
        .select('*')
        .single();
    if (error) throw error;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.author_id)
        .single();
        
    return { ...data, profiles: profile } as AnnotationData;
}

export async function updateAnnotation(
    annotationId: string,
    updates: Partial<AnnotationData>
): Promise<AnnotationData> {
    // Strip joined / read-only fields
    const { id, profiles, created_at, ...cleanUpdates } = updates as Record<string, unknown>;
    const { data, error } = await supabase
        .from('submission_annotations')
        .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
        .eq('id', annotationId)
        .select('*')
        .single();
    if (error) throw error;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.author_id)
        .single();
        
    return { ...data, profiles: profile } as AnnotationData;
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
    const { error } = await supabase
        .from('submission_annotations')
        .delete()
        .eq('id', annotationId);
    if (error) throw error;
}

export async function batchSaveAnnotations(
    annotations: Partial<AnnotationData>[]
): Promise<void> {
    if (annotations.length === 0) return;
    const { error } = await supabase
        .from('submission_annotations')
        .upsert(annotations as AnnotationData[], { onConflict: 'id' });
    if (error) throw error;
}

// ═══════════════════════════════════════════════════════
// Rubric Criterion Grades
// ═══════════════════════════════════════════════════════

export async function fetchCriterionGrades(submissionId: string): Promise<CriterionGrade[]> {
    const { data, error } = await supabase
        .from('rubric_criterion_grades')
        .select('*')
        .eq('submission_id', submissionId);
    if (error) throw error;
    return (data ?? []) as CriterionGrade[];
}

export async function upsertCriterionGrade(
    grade: Omit<CriterionGrade, 'id' | 'graded_at'>
): Promise<CriterionGrade> {
    const { data, error } = await supabase
        .from('rubric_criterion_grades')
        .upsert(
            { ...grade, graded_at: new Date().toISOString() },
            { onConflict: 'submission_id,criterion_id' }
        )
        .select()
        .single();
    if (error) throw error;
    return data as CriterionGrade;
}

export async function batchSaveCriterionGrades(
    grades: Omit<CriterionGrade, 'id' | 'graded_at'>[]
): Promise<void> {
    if (grades.length === 0) return;
    const withTimestamp = grades.map(g => ({ ...g, graded_at: new Date().toISOString() }));
    const { error } = await supabase
        .from('rubric_criterion_grades')
        .upsert(withTimestamp as CriterionGrade[], { onConflict: 'submission_id,criterion_id' });
    if (error) throw error;
}

// ═══════════════════════════════════════════════════════
// Submission Status Updates
// ═══════════════════════════════════════════════════════

export async function updateSubmissionGradeStatus(
    submissionId: string,
    updates: {
        status?: string;
        is_released?: boolean;
        overall_feedback?: string;
        total_grade?: number;
        graded_by?: string;
    }
): Promise<void> {
    const { error } = await supabase
        .from('assignment_submissions')
        .update({
            ...updates,
            graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    if (error) throw error;
}

// ═══════════════════════════════════════════════════════
// Real-time Subscriptions
// ═══════════════════════════════════════════════════════

export function subscribeToAnnotations(
    submissionId: string,
    callbacks: {
        onInsert: (a: AnnotationData) => void;
        onUpdate: (a: AnnotationData) => void;
        onDelete: (id: string) => void;
    }
) {
    const channel = supabase
        .channel(`annotations:${submissionId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'submission_annotations',
                filter: `submission_id=eq.${submissionId}`,
            },
            (payload) => callbacks.onInsert(payload.new as AnnotationData)
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'submission_annotations',
                filter: `submission_id=eq.${submissionId}`,
            },
            (payload) => callbacks.onUpdate(payload.new as AnnotationData)
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'submission_annotations',
                filter: `submission_id=eq.${submissionId}`,
            },
            (payload) => callbacks.onDelete((payload.old as Record<string, unknown>).id as string)
        )
        .subscribe();

    return channel;
}

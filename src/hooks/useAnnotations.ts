/**
 * useAnnotations — CRUD + real-time subscription for annotations.
 * Fetches annotations when submissionId changes, subscribes to Postgres changes.
 */
import { useEffect, useRef, useCallback } from 'react';
import type { AnnotationData } from '@/types/speedgrader';
import {
    fetchAnnotations,
    insertAnnotation as apiInsert,
    updateAnnotation as apiUpdate,
    deleteAnnotation as apiDelete,
    subscribeToAnnotations,
} from '@/lib/speedgrader-api';
import supabase from '@/lib/supabase';

interface UseAnnotationsOptions {
    submissionId: string | null;
    onAnnotationsLoaded: (annotations: AnnotationData[]) => void;
    onAnnotationInserted: (annotation: AnnotationData) => void;
    onAnnotationUpdated: (annotation: AnnotationData) => void;
    onAnnotationDeleted: (id: string) => void;
}

export function useAnnotations({
    submissionId,
    onAnnotationsLoaded,
    onAnnotationInserted,
    onAnnotationUpdated,
    onAnnotationDeleted,
}: UseAnnotationsOptions) {
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Fetch annotations when submission changes
    useEffect(() => {
        if (!submissionId) return;

        let cancelled = false;

        (async () => {
            try {
                const data = await fetchAnnotations(submissionId);
                if (!cancelled) {
                    onAnnotationsLoaded(data);
                }
            } catch (err) {
                console.error('[useAnnotations] Failed to fetch:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [submissionId]);

    // Real-time subscription
    useEffect(() => {
        if (!submissionId) return;

        // Clean up previous subscription
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        channelRef.current = subscribeToAnnotations(submissionId, {
            onInsert: onAnnotationInserted,
            onUpdate: onAnnotationUpdated,
            onDelete: onAnnotationDeleted,
        });

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [submissionId]);

    // CRUD wrappers
    const createAnnotation = useCallback(
        async (annotation: Omit<AnnotationData, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
            return apiInsert(annotation);
        },
        []
    );

    const editAnnotation = useCallback(
        async (id: string, updates: Partial<AnnotationData>) => {
            return apiUpdate(id, updates);
        },
        []
    );

    const removeAnnotation = useCallback(
        async (id: string) => {
            await apiDelete(id);
        },
        []
    );

    return {
        createAnnotation,
        editAnnotation,
        removeAnnotation,
    };
}

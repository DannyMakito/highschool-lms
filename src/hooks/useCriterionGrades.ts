/**
 * useCriterionGrades — Rubric scoring state + persistence.
 * Fetches grades when submission changes; provides upsert/batch-save.
 */
import { useEffect, useCallback } from 'react';
import type { CriterionGrade } from '@/types/speedgrader';
import {
    fetchCriterionGrades,
    upsertCriterionGrade,
    batchSaveCriterionGrades,
} from '@/lib/speedgrader-api';

interface UseCriterionGradesOptions {
    submissionId: string | null;
    onGradesLoaded: (grades: CriterionGrade[]) => void;
}

export function useCriterionGrades({
    submissionId,
    onGradesLoaded,
}: UseCriterionGradesOptions) {
    // Fetch on submission change
    useEffect(() => {
        if (!submissionId) return;

        let cancelled = false;

        (async () => {
            try {
                const grades = await fetchCriterionGrades(submissionId);
                if (!cancelled) {
                    onGradesLoaded(grades);
                }
            } catch (err) {
                console.error('[useCriterionGrades] Failed to fetch:', err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [submissionId]);

    const saveSingleGrade = useCallback(
        async (grade: Omit<CriterionGrade, 'id' | 'graded_at'>) => {
            return upsertCriterionGrade(grade);
        },
        []
    );

    const saveAllGrades = useCallback(
        async (grades: Omit<CriterionGrade, 'id' | 'graded_at'>[]) => {
            await batchSaveCriterionGrades(grades);
        },
        []
    );

    return { saveSingleGrade, saveAllGrades };
}


import { useSubjectsContext } from '@/context/SubjectsContext';

/**
 * Thin wrapper around SubjectsContext.
 * Data is fetched ONCE at the layout level and shared across all pages.
 */
export function useSubjects() {
    return useSubjectsContext();
}

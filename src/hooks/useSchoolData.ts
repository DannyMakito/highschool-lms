
import { useSchoolDataContext } from '@/context/SchoolDataContext';

/**
 * Thin wrapper around SchoolDataContext.
 * Data is fetched ONCE at the layout level and shared across all pages.
 */
export function useSchoolData() {
    return useSchoolDataContext();
}

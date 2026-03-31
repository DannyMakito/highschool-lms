
import { useRegistrationDataContext } from '@/context/RegistrationDataContext';

/**
 * Thin wrapper around RegistrationDataContext.
 * Data is fetched ONCE at the layout level and shared across all pages.
 */
export function useRegistrationData() {
    return useRegistrationDataContext();
}

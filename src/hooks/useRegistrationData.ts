import { useRegistrationDataContext } from "@/context/RegistrationDataContext";

/**
 * Thin wrapper around RegistrationDataContext.
 * Data is fetched once at the layout level and shared across pages.
 */
export function useRegistrationData() {
    return useRegistrationDataContext();
}

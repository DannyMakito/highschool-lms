
import { useMessagingContext } from '@/context/MessagingContext';

/**
 * Thin wrapper around MessagingContext.
 */
export function useAnnouncements() {
    const { announcements, loading, addAnnouncement, deleteAnnouncement } = useMessagingContext();
    return {
        announcements,
        loading,
        addAnnouncement,
        deleteAnnouncement,
    };
}

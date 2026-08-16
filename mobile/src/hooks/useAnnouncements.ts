import { useMessagingContext } from '../context/MessagingContext';

export function useAnnouncements() {
    const { announcements, loading, addAnnouncement, deleteAnnouncement } = useMessagingContext();
    return {
        announcements,
        loading,
        addAnnouncement,
        deleteAnnouncement,
    };
}

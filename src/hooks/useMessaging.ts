
import { useMessagingContext } from '@/context/MessagingContext';

/**
 * Universal messaging hook for announcements, discussions and replies.
 */
export function useMessaging() {
    return useMessagingContext();
}

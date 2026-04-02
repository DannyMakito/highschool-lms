
import { useMessagingContext } from '@/context/MessagingContext';

/**
 * Thin wrapper around MessagingContext.
 */
export const useDiscussions = (subjectId?: string) => {
    const {
        discussions,
        replies,
        loading,
        addDiscussion,
        updateDiscussion,
        deleteDiscussion,
        addReply,
        toggleLike,
        markAsRead,
        toggleSubscription,
        getSubjectDiscussions
    } = useMessagingContext();

    return {
        discussions: subjectId ? getSubjectDiscussions(subjectId) : discussions,
        replies,
        loading,
        addDiscussion,
        updateDiscussion,
        deleteDiscussion,
        addReply,
        toggleLike,
        markAsRead,
        toggleSubscription
    };
};

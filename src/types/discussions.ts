import type { UserRole } from "@/context/AuthContext";

export interface Discussion {
    id: string;
    subjectId: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole: UserRole;
    isPinned: boolean;
    isClosed: boolean;
    requirePostBeforeView: boolean;
    isGroup: boolean;
    groupId?: string;
    subjectClassId?: string;
    availableFrom: string;
    availableUntil?: string;
    allowThreadedReplies: boolean;
    allowLiking: boolean;
    subscribedUserIds: string[];
    readByUsers: string[]; // Track who has read the TOPIC
    createdAt: string;
    updatedAt: string;
}

export interface DiscussionReply {
    id: string;
    discussionId: string;
    parentId?: string; // For threaded replies
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole: UserRole;
    likes: string[]; // User IDs who liked
    readByUsers: string[]; // Track who has read this reply
    createdAt: string;
}

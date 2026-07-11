export interface Discussion {
    id: string;
    topicId?: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorRole?: string;
    authorAvatar?: string;
    createdAt: string;
    updatedAt?: string;
    subjectId?: string;
    subjectClassId?: string;
    isPinned?: boolean;
    isClosed?: boolean;
    requirePostBeforeView?: boolean;
    isGroup?: boolean;
    groupId?: string;
    availableFrom?: string;
    availableUntil?: string;
    allowThreadedReplies?: boolean;
    allowLiking?: boolean;
    teacherOnly?: boolean;
    readByUsers: string[];
    subscribedUserIds: string[];
}

export interface DiscussionReply {
    id: string;
    discussionId: string;
    parentId?: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    likes: string[];
    readByUsers: string[];
}


import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Announcement, Discussion, DiscussionReply } from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface MessagingContextType {
    announcements: Announcement[];
    discussions: Discussion[];
    replies: DiscussionReply[];
    loading: boolean;
    // Announcements
    addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => Promise<Announcement>;
    deleteAnnouncement: (id: string) => Promise<void>;
    // Discussions
    addDiscussion: (discussion: Omit<Discussion, 'id' | 'createdAt' | 'updatedAt' | 'readByUsers' | 'subscribedUserIds'>) => Promise<Discussion>;
    updateDiscussion: (id: string, updates: Partial<Discussion>) => Promise<void>;
    deleteDiscussion: (id: string) => Promise<void>;
    addReply: (reply: Omit<DiscussionReply, 'id' | 'createdAt' | 'likes' | 'readByUsers'>) => Promise<DiscussionReply>;
    toggleLike: (replyId: string, userId: string) => Promise<void>;
    markAsRead: (discussionId: string, userId: string) => Promise<void>;
    toggleSubscription: (discussionId: string, userId: string) => Promise<void>;
    getSubjectDiscussions: (subjectId?: string) => Discussion[];
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [replies, setReplies] = useState<DiscussionReply[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setAnnouncements([]);
            setDiscussions([]);
            setReplies([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchMessagingData = async () => {
            setLoading(true);

            try {
                // Fetch all in parallel
                const [annRes, discRes, repliesRes] = await Promise.all([
                    supabase.from('announcements').select('*, profiles!author_id(full_name, role, avatar_url)').order('created_at', { ascending: false }),
                    supabase.from('discussions').select('*, profiles!author_id(full_name, role, avatar_url)').order('updated_at', { ascending: false }),
                    supabase.from('discussion_replies').select('*, profiles!author_id(full_name, role, avatar_url)').order('created_at', { ascending: true }),
                ]);

                if (cancelled) return;

                setAnnouncements((annRes.data || []).map(a => ({
                    ...a,
                    authorName: (a as any).profiles?.full_name || 'System',
                    authorRole: (a as any).profiles?.role || 'Admin',
                    authorAvatar: (a as any).profiles?.avatar_url || '',
                    targetGrades: a.target_grades,
                    createdAt: a.created_at
                })));

                setDiscussions((discRes.data || []).map(d => ({
                    ...d,
                    subjectId: d.subject_id,
                    subjectClassId: d.subject_class_id,
                    authorId: d.author_id,
                    isPinned: d.is_pinned ?? d.isPinned ?? false,
                    isClosed: d.is_closed ?? d.isClosed ?? false,
                    requirePostBeforeView: d.require_post_before_view ?? d.requirePostBeforeView ?? false,
                    isGroup: d.is_group ?? d.isGroup ?? false,
                    groupId: d.group_id ?? d.groupId ?? undefined,
                    availableFrom: d.available_from ?? d.availableFrom ?? d.created_at,
                    availableUntil: d.available_until ?? d.availableUntil ?? undefined,
                    allowThreadedReplies: d.allow_threaded_replies ?? d.allowThreadedReplies ?? true,
                    allowLiking: d.allow_liking ?? d.allowLiking ?? false,
                    teacherOnly: d.teacher_only ?? d.teacherOnly ?? false,
                    authorName: (d as any).profiles?.full_name || 'Anonymous Instructor',
                    authorRole: (d as any).profiles?.role || 'teacher',
                    authorAvatar: (d as any).profiles?.avatar_url || '',
                    readByUsers: d.read_by_users || [],
                    subscribedUserIds: d.subscribed_user_ids || [],
                    isDeleted: d.is_deleted,
                    deletedByRole: d.deleted_by_role,
                    createdAt: d.created_at,
                    updatedAt: d.updated_at
                })));

                setReplies((repliesRes.data || []).map(r => ({
                    ...r,
                    discussionId: r.discussion_id,
                    parentId: r.parent_id ?? r.parentId ?? undefined,
                    authorId: r.author_id,
                    authorName: (r as any).profiles?.full_name || 'User',
                    authorRole: (r as any).profiles?.role || 'learner',
                    authorAvatar: (r as any).profiles?.avatar_url || '',
                    likes: r.likes || [],
                    readByUsers: r.read_by_users || [],
                    createdAt: r.created_at
                })));

            } catch (error) {
                console.error("Error fetching messaging data:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchMessagingData();

        const subscription = supabase.channel('messaging_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_replies' }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const { data } = await supabase.from('discussion_replies')
                        .select('*, profiles!author_id(full_name, role, avatar_url)')
                        .eq('id', payload.new.id)
                        .single();
                    if (data) {
                        const mappedR: DiscussionReply = {
                            ...data,
                            discussionId: data.discussion_id,
                            parentId: data.parent_id ?? undefined,
                            authorId: data.author_id,
                            authorName: (data as any).profiles?.full_name || 'User',
                            authorRole: (data as any).profiles?.role || 'learner',
                            authorAvatar: (data as any).profiles?.avatar_url || '',
                            likes: data.likes || [],
                            readByUsers: data.read_by_users || [],
                            createdAt: data.created_at
                        };
                        setReplies(prev => {
                            if (prev.some(r => r.id === mappedR.id)) return prev;
                            return [...prev, mappedR];
                        });
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setReplies(prev => prev.map(r => r.id === payload.new.id ? { 
                        ...r, 
                        likes: payload.new.likes || [],
                        readByUsers: payload.new.read_by_users || [],
                        content: payload.new.content
                    } : r));
                } else if (payload.eventType === 'DELETE') {
                    setReplies(prev => prev.filter(r => r.id !== payload.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'discussions' }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const { data } = await supabase.from('discussions')
                        .select('*, profiles!author_id(full_name, role, avatar_url)')
                        .eq('id', payload.new.id)
                        .single();
                    if (data) {
                         const mappedD: Discussion = {
                            ...data,
                            subjectId: data.subject_id,
                            subjectClassId: data.subject_class_id,
                            authorId: data.author_id,
                            isPinned: data.is_pinned ?? false,
                            isClosed: data.is_closed ?? false,
                            requirePostBeforeView: data.require_post_before_view ?? false,
                            isGroup: data.is_group ?? false,
                            groupId: data.group_id ?? undefined,
                            availableFrom: data.available_from ?? data.created_at,
                            availableUntil: data.available_until ?? undefined,
                            allowThreadedReplies: data.allow_threaded_replies ?? true,
                            allowLiking: data.allow_liking ?? false,
                            teacherOnly: data.teacher_only ?? false,
                            authorName: (data as any).profiles?.full_name || 'Anonymous Instructor',
                            authorRole: (data as any).profiles?.role || 'teacher',
                            authorAvatar: (data as any).profiles?.avatar_url || '',
                            readByUsers: data.read_by_users || [],
                            subscribedUserIds: data.subscribed_user_ids || [],
                            isDeleted: data.is_deleted,
                            deletedByRole: data.deleted_by_role,
                            createdAt: data.created_at,
                            updatedAt: data.updated_at
                        };
                        setDiscussions(prev => {
                            if (prev.some(d => d.id === mappedD.id)) return prev;
                            return [mappedD, ...prev];
                        });
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setDiscussions(prev => prev.map(d => {
                        if (d.id === payload.new.id) {
                            return {
                                ...d,
                                title: payload.new.title,
                                content: payload.new.content,
                                isPinned: payload.new.is_pinned ?? false,
                                isClosed: payload.new.is_closed ?? false,
                                requirePostBeforeView: payload.new.require_post_before_view ?? false,
                                isGroup: payload.new.is_group ?? false,
                                groupId: payload.new.group_id ?? undefined,
                                subjectClassId: payload.new.subject_class_id ?? undefined,
                                availableFrom: payload.new.available_from ?? payload.new.created_at,
                                availableUntil: payload.new.available_until ?? undefined,
                                allowThreadedReplies: payload.new.allow_threaded_replies ?? true,
                                allowLiking: payload.new.allow_liking ?? false,
                                teacherOnly: payload.new.teacher_only ?? false,
                                readByUsers: payload.new.read_by_users || [],
                                subscribedUserIds: payload.new.subscribed_user_ids || [],
                                isDeleted: payload.new.is_deleted,
                                deletedByRole: payload.new.deleted_by_role,
                                updatedAt: payload.new.updated_at
                            };
                        }
                        return d;
                    }));
                } else if (payload.eventType === 'DELETE') {
                    setDiscussions(prev => prev.filter(d => d.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { 
            cancelled = true; 
            supabase.removeChannel(subscription);
        };
    }, [user?.id, authLoading]);

    // Announcements actions
    const addAnnouncement = async (announcement: Omit<Announcement, 'id' | 'createdAt'>) => {
        const { data: newA, error } = await supabase
            .from('announcements')
            .insert({
                title: announcement.title,
                content: announcement.content,
                author_id: user?.id || '',
                target_grades: announcement.targetGrades
            })
            .select()
            .single();

        if (error) throw error;

        const mappedA: Announcement = {
            ...announcement,
            id: newA.id,
            authorName: newA.author_id,
            createdAt: newA.created_at
        };
        setAnnouncements(prev => [mappedA, ...prev]);
        return mappedA;
    };

    const deleteAnnouncement = async (id: string) => {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw error;
        setAnnouncements(prev => prev.filter(a => a.id !== id));
    };

    // Discussion actions
    const addDiscussion = async (discussion: Omit<Discussion, 'id' | 'createdAt' | 'updatedAt' | 'readByUsers' | 'subscribedUserIds'>) => {
        const { data: newD, error } = await supabase
            .from('discussions')
            .insert({
                subject_id: discussion.subjectId,
                subject_class_id: discussion.subjectClassId,
                title: discussion.title,
                content: discussion.content,
                author_id: discussion.authorId,
                is_pinned: discussion.isPinned ?? false,
                is_closed: discussion.isClosed ?? false,
                require_post_before_view: discussion.requirePostBeforeView ?? false,
                is_group: discussion.isGroup ?? false,
                group_id: discussion.groupId || null,
                available_from: discussion.availableFrom || new Date().toISOString(),
                available_until: discussion.availableUntil || null,
                allow_threaded_replies: discussion.allowThreadedReplies ?? true,
                allow_liking: discussion.allowLiking ?? false,
                teacher_only: discussion.teacherOnly ?? false,

                read_by_users: [discussion.authorId],
                subscribed_user_ids: [discussion.authorId]
            })
            .select()
            .single();

        if (error) throw error;

        const mappedD: Discussion = {
            ...newD,
            subjectId: newD.subject_id,
            subjectClassId: newD.subject_class_id,
            authorId: newD.author_id,
            isPinned: newD.is_pinned ?? false,
            isClosed: newD.is_closed ?? false,
            requirePostBeforeView: newD.require_post_before_view ?? false,
            isGroup: newD.is_group ?? false,
            groupId: newD.group_id ?? undefined,
            availableFrom: newD.available_from ?? newD.created_at,
            availableUntil: newD.available_until ?? undefined,
            allowThreadedReplies: newD.allow_threaded_replies ?? true,
            allowLiking: newD.allow_liking ?? false,
            teacherOnly: newD.teacher_only ?? false,
            authorName: discussion.authorName,
            authorRole: discussion.authorRole,
            authorAvatar: discussion.authorAvatar || '',
            readByUsers: newD.read_by_users,
            subscribedUserIds: newD.subscribed_user_ids,
            createdAt: newD.created_at,
            updatedAt: newD.updated_at
        };

        setDiscussions(prev => [mappedD, ...prev]);
        return mappedD;
    };

    const updateDiscussion = async (id: string, updates: Partial<Discussion>) => {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.content) dbUpdates.content = updates.content;
        if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
        if (updates.isClosed !== undefined) dbUpdates.is_closed = updates.isClosed;
        if (updates.requirePostBeforeView !== undefined) dbUpdates.require_post_before_view = updates.requirePostBeforeView;
        if (updates.isGroup !== undefined) dbUpdates.is_group = updates.isGroup;
        if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
        if (updates.subjectClassId !== undefined) dbUpdates.subject_class_id = updates.subjectClassId;
        if (updates.availableFrom !== undefined) dbUpdates.available_from = updates.availableFrom;
        if (updates.availableUntil !== undefined) dbUpdates.available_until = updates.availableUntil || null;
        if (updates.allowThreadedReplies !== undefined) dbUpdates.allow_threaded_replies = updates.allowThreadedReplies;
        if (updates.allowLiking !== undefined) dbUpdates.allow_liking = updates.allowLiking;
        if (updates.teacherOnly !== undefined) dbUpdates.teacher_only = updates.teacherOnly;

        const { error } = await supabase.from('discussions').update(dbUpdates).eq('id', id);
        if (error) throw error;

        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: dbUpdates.updated_at } : d));
    };

    const deleteDiscussion = async (id: string) => {
        const disc = discussions.find(d => d.id === id);
        if (!disc) return;

        // Soft delete if teacher/principal is deleting someone else's post
        if ((user?.role === 'teacher' || user?.role === 'principal') && disc.authorId !== user?.id) {
            const { error } = await supabase
                .from('discussions')
                .update({ 
                    is_deleted: true, 
                    deleted_by_role: user.role 
                })
                .eq('id', id);
            
            if (error) throw error;

            setDiscussions(prev => prev.map(d => 
                d.id === id ? { ...d, isDeleted: true, deletedByRole: user.role } : d
            ));
        } else {
            // Hard delete for own posts or when student deletes their own
            const { error } = await supabase.from('discussions').delete().eq('id', id);
            if (error) throw error;

            setDiscussions(prev => prev.filter(d => d.id !== id));
            setReplies(prev => prev.filter(r => r.discussionId !== id));
        }
    };

    const addReply = async (reply: Omit<DiscussionReply, 'id' | 'createdAt' | 'likes' | 'readByUsers'>) => {
        const { data: newR, error } = await supabase
            .from('discussion_replies')
            .insert({
                discussion_id: reply.discussionId,
                parent_id: reply.parentId || null,
                author_id: reply.authorId,
                content: reply.content,
                read_by_users: [reply.authorId]
            })
            .select()
            .single();

        if (error) throw error;

        const updatedAt = new Date().toISOString();
        await supabase.from('discussions').update({ updated_at: updatedAt }).eq('id', reply.discussionId);

        const mappedR: DiscussionReply = {
            ...newR,
            discussionId: newR.discussion_id,
            parentId: newR.parent_id ?? undefined,
            authorId: newR.author_id,
            likes: [],
            readByUsers: newR.read_by_users,
            createdAt: newR.created_at
        };

        setReplies(prev => [...prev, mappedR]);
        setDiscussions(prev => prev.map(d => d.id === reply.discussionId ? { ...d, updatedAt } : d));
        return mappedR;
    };

    const toggleLike = async (replyId: string, userId: string) => {
        const reply = replies.find(r => r.id === replyId);
        if (!reply) return;

        const liked = reply.likes.includes(userId);
        const newLikes = liked ? reply.likes.filter(id => id !== userId) : [...reply.likes, userId];

        const { error } = await supabase.from('discussion_replies').update({ likes: newLikes }).eq('id', replyId);
        if (error) throw error;

        setReplies(prev => prev.map(r => r.id === replyId ? { ...r, likes: newLikes } : r));
    };

    const markAsRead = async (discussionId: string, userId: string) => {
        const disc = discussions.find(d => d.id === discussionId);
        if (disc && !disc.readByUsers.includes(userId)) {
            const newRead = [...disc.readByUsers, userId];
            await supabase.from('discussions').update({ read_by_users: newRead }).eq('id', discussionId);
            setDiscussions(prev => prev.map(d => d.id === discussionId ? { ...d, readByUsers: newRead } : d));
        }

        const pendingReplies = replies.filter(r => r.discussionId === discussionId && !r.readByUsers.includes(userId));
        for (const r of pendingReplies) {
            const newRead = [...r.readByUsers, userId];
            await supabase.from('discussion_replies').update({ read_by_users: newRead }).eq('id', r.id);
        }

        setReplies(prev => prev.map(r => {
            if (r.discussionId === discussionId && !r.readByUsers.includes(userId)) {
                return { ...r, readByUsers: [...r.readByUsers, userId] };
            }
            return r;
        }));
    };

    const toggleSubscription = async (discussionId: string, userId: string) => {
        const disc = discussions.find(d => d.id === discussionId);
        if (!disc) return;

        const subbed = disc.subscribedUserIds.includes(userId);
        const newSubs = subbed ? disc.subscribedUserIds.filter(id => id !== userId) : [...disc.subscribedUserIds, userId];

        const { error } = await supabase.from('discussions').update({ subscribed_user_ids: newSubs }).eq('id', discussionId);
        if (error) throw error;

        setDiscussions(prev => prev.map(d => d.id === discussionId ? { ...d, subscribedUserIds: newSubs } : d));
    };

    const getSubjectDiscussions = useCallback((subjectId?: string) => {
        if (!subjectId) return discussions;
        return discussions.filter(d => d.subjectId === subjectId);
    }, [discussions]);

    const value = {
        announcements,
        discussions,
        replies,
        loading,
        addAnnouncement,
        deleteAnnouncement,
        addDiscussion,
        updateDiscussion,
        deleteDiscussion,
        addReply,
        toggleLike,
        markAsRead,
        toggleSubscription,
        getSubjectDiscussions
    };

    return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessagingContext() {
    const context = useContext(MessagingContext);
    if (context === undefined) {
        throw new Error("useMessagingContext must be used within a MessagingProvider");
    }
    return context;
}

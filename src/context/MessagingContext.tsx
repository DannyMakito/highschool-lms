
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

            // Failsafe timer
            const timer = setTimeout(() => {
                if (!cancelled && loading) {
                    console.warn("Messaging data fetch timed out, forcing loading to false");
                    setLoading(false);
                }
            }, 5000);

            try {
                // Fetch all in parallel
                const [annRes, discRes, repliesRes] = await Promise.all([
                    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
                    supabase.from('discussions').select('*').order('updated_at', { ascending: false }),
                    supabase.from('discussion_replies').select('*').order('created_at', { ascending: true }),
                ]);

                if (cancelled) return;

                setAnnouncements((annRes.data || []).map(a => ({
                    ...a,
                    authorName: a.author_id,
                    authorRole: 'Admin',
                    targetGrades: a.target_grades,
                    createdAt: a.created_at
                })));

                setDiscussions((discRes.data || []).map(d => ({
                    ...d,
                    subjectId: d.subject_id,
                    authorId: d.author_id,
                    readByUsers: d.read_by_users || [],
                    subscribedUserIds: d.subscribed_user_ids || [],
                    createdAt: d.created_at,
                    updatedAt: d.updated_at
                })));

                setReplies((repliesRes.data || []).map(r => ({
                    ...r,
                    discussionId: r.discussion_id,
                    authorId: r.author_id,
                    likes: r.likes || [],
                    readByUsers: r.read_by_users || [],
                    createdAt: r.created_at
                })));

            } catch (error) {
                console.error("Error fetching messaging data:", error);
            } finally {
                clearTimeout(timer);
                if (!cancelled) setLoading(false);
            }
        };

        fetchMessagingData();

        return () => { cancelled = true; };
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
                title: discussion.title,
                content: discussion.content,
                author_id: discussion.authorId,
                read_by_users: [discussion.authorId],
                subscribed_user_ids: [discussion.authorId]
            })
            .select()
            .single();

        if (error) throw error;

        const mappedD: Discussion = {
            ...newD,
            subjectId: newD.subject_id,
            authorId: newD.author_id,
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

        const { error } = await supabase.from('discussions').update(dbUpdates).eq('id', id);
        if (error) throw error;

        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: dbUpdates.updated_at } : d));
    };

    const deleteDiscussion = async (id: string) => {
        const { error } = await supabase.from('discussions').delete().eq('id', id);
        if (error) throw error;

        setDiscussions(prev => prev.filter(d => d.id !== id));
        setReplies(prev => prev.filter(r => r.discussionId !== id));
    };

    const addReply = async (reply: Omit<DiscussionReply, 'id' | 'createdAt' | 'likes' | 'readByUsers'>) => {
        const { data: newR, error } = await supabase
            .from('discussion_replies')
            .insert({
                discussion_id: reply.discussionId,
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

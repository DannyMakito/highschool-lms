
import { useState, useEffect } from 'react';
import type { Discussion, DiscussionReply } from '@/types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export const useDiscussions = (subjectId?: string) => {
    const { user } = useAuth();
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [replies, setReplies] = useState<DiscussionReply[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchDiscussions = async () => {
            setLoading(true);
            try {
                let discQuery = supabase.from('discussions').select('*');
                if (subjectId) discQuery = discQuery.eq('subject_id', subjectId);

                const { data: discData } = await discQuery.order('updated_at', { ascending: false });

                const { data: replyData } = await supabase
                    .from('discussion_replies')
                    .select('*')
                    .order('created_at', { ascending: true });

                setDiscussions((discData || []).map(d => ({
                    ...d,
                    subjectId: d.subject_id,
                    authorId: d.author_id,
                    readByUsers: d.read_by_users || [],
                    subscribedUserIds: d.subscribed_user_ids || [],
                    createdAt: d.created_at,
                    updatedAt: d.updated_at
                })));

                setReplies((replyData || []).map(r => ({
                    ...r,
                    discussionId: r.discussion_id,
                    authorId: r.author_id,
                    likes: r.likes || [],
                    readByUsers: r.read_by_users || [],
                    createdAt: r.created_at
                })));
            } catch (error) {
                console.error("Error fetching discussions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDiscussions();
    }, [subjectId, user?.id]);

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

        const { error } = await supabase
            .from('discussions')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: dbUpdates.updated_at } : d));
    };

    const deleteDiscussion = async (id: string) => {
        const { error } = await supabase
            .from('discussions')
            .delete()
            .eq('id', id);

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

        // Update discussion updatedAt
        await supabase.from('discussions').update({ updated_at: new Date().toISOString() }).eq('id', reply.discussionId);

        const mappedR: DiscussionReply = {
            ...newR,
            discussionId: newR.discussion_id,
            authorId: newR.author_id,
            likes: [],
            readByUsers: newR.read_by_users,
            createdAt: newR.created_at
        };

        setReplies(prev => [...prev, mappedR]);
        return mappedR;
    };

    const toggleLike = async (replyId: string, userId: string) => {
        const reply = replies.find(r => r.id === replyId);
        if (!reply) return;

        const liked = reply.likes.includes(userId);
        const newLikes = liked ? reply.likes.filter(id => id !== userId) : [...reply.likes, userId];

        const { error } = await supabase
            .from('discussion_replies')
            .update({ likes: newLikes })
            .eq('id', replyId);

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

        // Mark all replies as read in DB
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

        const { error } = await supabase
            .from('discussions')
            .update({ subscribed_user_ids: newSubs })
            .eq('id', discussionId);

        if (error) throw error;

        setDiscussions(prev => prev.map(d => d.id === discussionId ? { ...d, subscribedUserIds: newSubs } : d));
    };

    return {
        discussions,
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

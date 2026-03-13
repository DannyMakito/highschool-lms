
import { useState, useEffect } from 'react';
import type { Announcement } from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useAnnouncements() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial Fetch
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchAnnouncements = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                setAnnouncements((data || []).map(a => ({
                    ...a,
                    authorName: a.author_id, // Map as needed or join with profile
                    authorRole: 'Admin', // Static for now or fetch
                    targetGrades: a.target_grades,
                    createdAt: a.created_at
                })));
            } catch (error) {
                console.error("Error fetching announcements:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, [user?.id]);

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
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setAnnouncements(prev => prev.filter(a => a.id !== id));
    };

    return {
        announcements,
        loading,
        addAnnouncement,
        deleteAnnouncement,
    };
}

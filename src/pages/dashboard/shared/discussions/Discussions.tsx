import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/context/AuthContext';
import { useSubjects } from '@/hooks/useSubjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Plus,
    Search,
    Settings,
    MessageSquare,
    Pin,
    Lock,
    Bell,
    CheckCircle2,
    ChevronRight,
    Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Discussion } from '@/types';

interface DiscussionItemProps {
    discussion: Discussion;
    unreadCount: number;
    totalCount: number;
    isUnread: boolean;
    subjectId?: string;
    subjects: any[];
    role: string | null;
    navigate: (path: string) => void;
    isTeacher: boolean;
    user: any;
}

const DiscussionItem = ({ 
    discussion, 
    unreadCount, 
    totalCount, 
    isUnread, 
    subjectId, 
    subjects, 
    role, 
    navigate, 
    isTeacher,
    user
}: DiscussionItemProps) => {
    return (
        <div
            className="group flex items-center justify-between p-4 border-b hover:bg-slate-50 cursor-pointer bg-white transition-colors"
            onClick={() => {
                const finalSubjectId = subjectId || discussion.subjectId;
                const prefix = role === 'learner' ? '/student' : '/teacher';
                navigate(`${prefix}/subjects/${finalSubjectId}/discussions/view/${discussion.id}`);
            }}
        >
            <div className="flex gap-4 items-start">
                <div className="mt-1">
                    {isUnread ? (
                        <div className="w-2 h-2 rounded-full bg-blue-600" title="Unread" />
                    ) : (
                        <div className="w-2 h-2" />
                    )}
                </div>
                <div className="space-y-1">
                    <h4 className="font-semibold text-blue-600 hover:underline flex items-center gap-2">
                        {discussion.title}
                        {discussion.isClosed && <Lock className="w-3 h-3 text-slate-400" />}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        {!subjectId && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 border-slate-200 text-slate-400 font-medium">
                                {subjects.find(s => s.id === discussion.subjectId)?.name || 'Unknown Subject'}
                            </Badge>
                        )}
                        <span>Last post {format(new Date(discussion.updatedAt), 'MMM d, yyyy')}</span>
                        {discussion.availableUntil && (
                            <span className="text-slate-400">Available until {format(new Date(discussion.availableUntil), 'MMM d')}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    {discussion.subscribedUserIds.includes(user?.id) && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    <div className="relative flex items-center justify-center w-10 h-6">
                        <MessageSquare className="w-5 h-5 text-slate-400" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] px-1 rounded-sm font-bold">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                        {totalCount}
                    </Badge>
                </div>

                {isTeacher && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};

const Discussions: React.FC = () => {
    const { id: subjectId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const { subjects } = useSubjects();
    const { 
        discussions, 
        replies, 
        loading, 
        markAsRead 
    } = useDiscussions(subjectId);

    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const isTeacher = role === 'teacher' || role === 'principal';

    const getRepliesCount = (discussionId: string) => {
        return replies.filter(r => r.discussionId === discussionId).length;
    };

    const getUnreadRepliesCount = (discussionId: string) => {
        if (!user) return 0;
        return replies.filter(r => r.discussionId === discussionId && !r.readByUsers.includes(user.id)).length;
    };

    const filteredDiscussions = discussions.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.authorName.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (filter === 'unread') {
            const hasUnreadReplies = getUnreadRepliesCount(d.id) > 0;
            const isUnreadTopic = user && !d.readByUsers.includes(user.id);
            return matchesSearch && (hasUnreadReplies || isUnreadTopic);
        }
        
        return matchesSearch;
    });

    const pinnedDiscussions = filteredDiscussions.filter(d => d.isPinned && !d.isClosed);
    const regularDiscussions = filteredDiscussions.filter(d => !d.isPinned && !d.isClosed);
    const closedDiscussions = filteredDiscussions.filter(d => d.isClosed);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh] text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2" />
                Wait while we sync your portal...
            </div>
        );
    }

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 bg-slate-50 min-h-screen py-6 font-sans">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search title, body, or author"
                            className="pl-10 bg-white border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant={filter === 'unread' ? 'default' : 'outline'}
                        className={cn("bg-white border-slate-200", filter === 'unread' && "bg-slate-800 text-white")}
                        onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
                    >
                        Unread
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {isTeacher && (
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm flex items-center gap-2"
                            onClick={() => navigate('create')}
                        >
                            <Plus className="w-4 h-4" />
                            Discussion
                        </Button>
                    )}
                    <Button variant="outline" size="icon" className="bg-white border-slate-200">
                        <Settings className="w-4 h-4 text-slate-600" />
                    </Button>
                </div>
            </div>

            {/* Pinned Section */}
            {pinnedDiscussions.length > 0 && (
                <div className="mb-8 border rounded overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b flex items-center gap-2">
                        <chevronright className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-700">Pinned Discussions</h3>
                    </div>
                    {pinnedDiscussions.map(d => (
                        <DiscussionItem 
                            key={d.id} 
                            discussion={d} 
                            unreadCount={getUnreadRepliesCount(d.id)}
                            totalCount={getRepliesCount(d.id)}
                            isUnread={!!user && !d.readByUsers.includes(user.id)}
                            subjectId={subjectId}
                            subjects={subjects}
                            role={role}
                            navigate={navigate}
                            isTeacher={isTeacher}
                            user={user}
                        />
                    ))}
                </div>
            )}

            {/* General Discussions */}
            <div className="mb-8 border rounded overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-700">Discussions</h3>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ordered by Recent Activity</span>
                </div>
                {regularDiscussions.length > 0 ? (
                    regularDiscussions.map(d => (
                        <DiscussionItem 
                            key={d.id} 
                            discussion={d} 
                            unreadCount={getUnreadRepliesCount(d.id)}
                            totalCount={getRepliesCount(d.id)}
                            isUnread={!!user && !d.readByUsers.includes(user.id)}
                            subjectId={subjectId}
                            subjects={subjects}
                            role={role}
                            navigate={navigate}
                            isTeacher={isTeacher}
                            user={user}
                        />
                    ))
                ) : (
                    <div className="p-12 text-center bg-white text-slate-400 text-sm">
                        No discussions found.
                    </div>
                )}
            </div>

            {/* Closed Section */}
            {closedDiscussions.length > 0 && (
                <div className="border rounded overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-700">Closed for Comments</h3>
                    </div>
                    {closedDiscussions.map(d => (
                        <DiscussionItem 
                            key={d.id} 
                            discussion={d} 
                            unreadCount={getUnreadRepliesCount(d.id)}
                            totalCount={getRepliesCount(d.id)}
                            isUnread={!!user && !d.readByUsers.includes(user.id)}
                            subjectId={subjectId}
                            subjects={subjects}
                            role={role}
                            navigate={navigate}
                            isTeacher={isTeacher}
                            user={user}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Discussions;

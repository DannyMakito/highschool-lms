import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/context/AuthContext';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { useSchoolData } from '@/hooks/useSchoolData';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TinyMCEEditor from '@/components/shared/TinyMCEEditor';
import {
    Reply as ReplyIcon,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
    Settings,
    MoreHorizontal,
    CheckCircle,
    Bell,
    ChevronLeft
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Discussion, DiscussionReply } from '@/types';
import { getRolePathPrefix } from '@/lib/role-path';

interface ReplyItemProps {
    reply: DiscussionReply;
    discussionReplies: DiscussionReply[];
    replyToId: string | null;
    replyContent: string;
    setReplyToId: (id: string | null) => void;
    setReplyContent: (content: string) => void;
    user: any;
    toggleLike: (replyId: string, userId: string) => Promise<void>;
    handlePostReply: (parentId?: string) => void;
    depth?: number;
}

const ReplyItem = ({ 
    reply, 
    discussionReplies, 
    replyToId, 
    replyContent, 
    setReplyToId, 
    setReplyContent, 
    user, 
    toggleLike, 
    handlePostReply, 
    depth = 0 
}: ReplyItemProps) => {
    const childReplies = discussionReplies.filter(r => r.parentId === reply.id);
    const isEditing = replyToId === reply.id;
    const hasLiked = user && reply.likes.includes(user.id);

    return (
        <div className={cn("relative group", depth > 0 ? "ml-8 md:ml-12 mt-6" : "mt-8")}>
            {/* Thread Line (Elbow Catch) */}
            {depth > 0 && (
                <div className="absolute top-[-36px] bottom-4 pointer-events-none" 
                     style={{ 
                         left: depth === 1 ? '-29px' : '-33px', // Aligned with parent drop (19px/15px) - indent (48px/etc? ml-12 is 3rem=48px)
                         width: depth === 1 ? '30px' : '34px'
                     }}>
                    <div className="absolute left-0 top-0 bottom-[14px] w-[1.5px] bg-slate-200" />
                    <div className="absolute left-0 bottom-[14px] h-[16px] w-full border-l-[1.5px] border-b-[1.5px] border-slate-200 rounded-bl-xl" />
                </div>
            )}

            {/* Continuation Line (Vertical Drop for Children) */}
            {childReplies.length > 0 && (
                <div 
                    className="absolute top-10 bottom-0 w-[1.5px] bg-slate-200 pointer-events-none" 
                    style={{ left: depth === 0 ? '19px' : '15px' }} 
                />
            )}

            <div className="flex gap-3 md:gap-4 items-start">
                <Avatar className={cn("shrink-0 shadow-sm transition-transform group-hover:scale-105", depth === 0 ? "w-10 h-10" : "w-8 h-8")}>
                    <AvatarImage src={reply.authorAvatar || ''} />
                    <AvatarFallback className="bg-slate-100 text-slate-500 font-bold text-xs">
                        {(reply.authorName || 'U').charAt(0)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm hover:underline cursor-pointer tracking-tight">
                            {reply.authorName || 'Student'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </span>
                    </div>

                    <div
                        className="text-[14px] leading-relaxed text-slate-700 mb-2 discussion-content"
                        dangerouslySetInnerHTML={{ __html: reply.content }}
                    />

                    <div className="flex items-center gap-1 -ml-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 px-2 flex items-center gap-1.5 hover:bg-slate-100/80 rounded-full", hasLiked ? "text-blue-600" : "text-slate-500")}
                            onClick={() => user && toggleLike(reply.id, user.id)}
                        >
                            <ThumbsUp className={cn("w-3.5 h-3.5", hasLiked && "fill-current")} />
                            <span className="text-xs font-bold">{reply.likes.length || ''}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-slate-500 hover:bg-slate-100/80 rounded-full"
                        >
                            <ThumbsDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-slate-600 hover:bg-slate-100/80 rounded-full flex items-center gap-1.5"
                            onClick={() => {
                                setReplyToId(reply.id);
                                setReplyContent('');
                            }}
                        >
                            <span className="text-[11px] font-bold">Reply</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-100/80 rounded-full"
                        >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {isEditing && (
                        <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                            <TinyMCEEditor
                                value={replyContent}
                                onChange={setReplyContent}
                                height={200}
                                placeholder="Add a public reply..."
                            />
                            <div className="flex justify-end gap-2 mt-3">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="font-bold text-slate-500 hover:bg-white" 
                                    onClick={() => setReplyToId(null)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-5" 
                                    onClick={() => handlePostReply(reply.id)}
                                >
                                    Reply
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Nested Replies Render */}
                    <div className="space-y-2">
                        {childReplies.map(child => (
                            <ReplyItem 
                                key={child.id} 
                                reply={child} 
                                depth={depth + 1}
                                discussionReplies={discussionReplies}
                                replyToId={replyToId}
                                replyContent={replyContent}
                                setReplyToId={setReplyToId}
                                setReplyContent={setReplyContent}
                                user={user}
                                toggleLike={toggleLike}
                                handlePostReply={handlePostReply}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DiscussionView: React.FC = () => {
    const { id: subjectId, discussionId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const { studentSubjectClasses, subjectClasses } = useRegistrationData();
    const { classes } = useSchoolData();
    const {
        discussions,
        replies,
        addReply,
        toggleLike,
        markAsRead,
        toggleSubscription
    } = useDiscussions(subjectId);
    const rolePrefix = getRolePathPrefix(role);

    const [replyToId, setReplyToId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isTopicReplyOpen, setIsTopicReplyOpen] = useState(false);

    const visibleGroupIds = React.useMemo(() => {
        if (!user) return [];
        if (role === 'learner') {
            return studentSubjectClasses.filter((item) => item.studentId === user.id).map((item) => item.subjectClassId);
        }
        if (role === 'teacher') {
            return classes.filter((item) => item.teacherId === user.id).map((item) => item.id);
        }
        return subjectClasses.map((item) => item.id);
    }, [classes, role, studentSubjectClasses, subjectClasses, user]);

    const discussion = discussions.find(d => {
        if (d.id !== discussionId) return false;
        if (!d.isGroup || !d.groupId) return true;
        return visibleGroupIds.includes(d.groupId);
    });
    const discussionReplies = replies.filter(r => r.discussionId === discussionId);

    useEffect(() => {
        if (discussion && user) {
            markAsRead(discussion.id, user.id);
        }
    }, [discussion?.id, user?.id]);

    if (!discussion) return <div>Discussion not found</div>;

    const isSubscribed = user && discussion.subscribedUserIds.includes(user.id);
    const hasPosted = user && (role === 'teacher' || role === 'principal' || discussionReplies.some(r => r.authorId === user.id));
    const showReplies = !discussion.requirePostBeforeView || hasPosted;

    const handlePostReply = (parentId?: string) => {
        if (!replyContent) {
            toast.error('Reply content cannot be empty');
            return;
        }

        addReply({
            discussionId: discussion.id,
            parentId,
            content: replyContent,
            authorId: user?.id || '1',
            authorName: user?.name || 'User',
            authorAvatar: '',
            authorRole: user?.role || 'learner',
        });

        setReplyContent('');
        setReplyToId(null);
        setIsTopicReplyOpen(false);
        toast.success('Reply posted');
    };

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 py-6 font-sans bg-white min-h-screen">
            <Button
                variant="ghost"
                className="mb-6 -ml-2 text-slate-500 hover:text-blue-600"
                onClick={() => {
                    if (subjectId) {
                        navigate(`${rolePrefix}/subjects/${subjectId}/discussions`);
                    } else if (discussion?.subjectId) {
                        navigate(`${rolePrefix}/subjects/${discussion.subjectId}/discussions`);
                    } else {
                        navigate(`${rolePrefix}/discussions`);
                    }
                }}
            >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Discussions
            </Button>

            {/* Topic Header */}
            <div className="mb-12 pb-10 border-b border-slate-100">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 md:gap-6 items-center">
                        <Avatar className="w-12 h-12 md:w-14 md:h-14 ring-2 ring-blue-50 ring-offset-2">
                            <AvatarImage src={discussion.authorAvatar || ''} />
                            <AvatarFallback className="bg-blue-600 text-white font-bold text-xl">
                                {(discussion.authorName || 'U').charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">{discussion.title}</h1>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 text-sm">{discussion.authorName || 'Instructor'}</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs text-slate-400 font-medium">{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <Button
                            variant={isSubscribed ? "secondary" : "outline"}
                            className={cn("h-9 rounded-full px-4 text-xs font-bold transition-all", isSubscribed && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100")}
                            onClick={() => user && toggleSubscription(discussion.id, user.id)}
                        >
                            <Bell className={cn("w-3.5 h-3.5 mr-2", isSubscribed ? "text-green-600 fill-current" : "text-slate-400")} />
                            {isSubscribed ? "Subscribed" : "Notify Me"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-400 hover:bg-slate-100">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div
                    className="text-[16px] leading-relaxed text-slate-800 mb-8 max-w-none discussion-content prose-headings:text-slate-900 prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: discussion.content }}
                />

                {!discussion.isClosed && (
                    <div className="flex items-center gap-4">
                        <Button
                            variant="default"
                            className="h-10 rounded-full px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200/50 flex items-center gap-2 transition-all active:scale-95"
                            onClick={() => setIsTopicReplyOpen(true)}
                        >
                            <ReplyIcon className="w-4 h-4 rotate-180" />
                            Post a Reply
                        </Button>
                    </div>
                )}
            </div>

            {/* Replies Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        {discussionReplies.length} Replies
                    </h3>
                </div>

                {isTopicReplyOpen && (
                    <div className="mb-10 space-y-4 animate-in fade-in slide-in-from-top-4">
                        <TinyMCEEditor
                            value={replyContent}
                            onChange={setReplyContent}
                            height={300}
                            placeholder="Type your response..."
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsTopicReplyOpen(false)}>Cancel</Button>
                            <Button className="bg-blue-600 px-8" onClick={() => handlePostReply()}>Post Reply</Button>
                        </div>
                    </div>
                )}

                {!showReplies ? (
                    <div className="p-12 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <p className="text-slate-600 font-medium">Replies are hidden until you post your own response.</p>
                    </div>
                ) : (
                    <div className="pb-20">
                        {discussionReplies.filter(r => !r.parentId).map(reply => (
                            <ReplyItem 
                                key={reply.id} 
                                reply={reply} 
                                discussionReplies={discussionReplies}
                                replyToId={replyToId}
                                replyContent={replyContent}
                                setReplyToId={setReplyToId}
                                setReplyContent={setReplyContent}
                                user={user}
                                toggleLike={toggleLike}
                                handlePostReply={handlePostReply}
                            />
                        ))}
                        {discussionReplies.length === 0 && !isTopicReplyOpen && (
                            <p className="text-center py-20 text-slate-400">No replies yet. Be the first to respond!</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiscussionView;

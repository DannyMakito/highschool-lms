import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TinyMCEEditor from '@/components/shared/TinyMCEEditor';
import {
    Reply as ReplyIcon,
    ThumbsUp,
    Settings,
    MoreVertical,
    CheckCircle,
    Bell,
    ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Discussion, DiscussionReply } from '@/types';

const DiscussionView: React.FC = () => {
    const { id: subjectId, discussionId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const {
        discussions,
        replies,
        addReply,
        toggleLike,
        markAsRead,
        toggleSubscription
    } = useDiscussions(subjectId);

    const [replyToId, setReplyToId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isTopicReplyOpen, setIsTopicReplyOpen] = useState(false);

    const discussion = discussions.find(d => d.id === discussionId);
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

    const ReplyItem = ({ reply, depth = 0 }: { reply: DiscussionReply, depth?: number }) => {
        const childReplies = discussionReplies.filter(r => r.parentId === reply.id);
        const isEditing = replyToId === reply.id;
        const hasLiked = user && reply.likes.includes(user.id);

        return (
            <div className={cn("mt-4", depth > 0 && "ml-12 border-l-2 pl-6")}>
                <div className="bg-white border rounded-sm p-6 shadow-sm relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4 items-center">
                            <Avatar className="w-12 h-12">
                                <AvatarImage src={reply.authorAvatar} />
                                <AvatarFallback className="bg-slate-200 text-slate-500 font-bold">
                                    {reply.authorName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="font-bold text-blue-600 hover:underline cursor-pointer">{reply.authorName}</h4>
                                <p className="text-xs text-slate-500">{format(new Date(reply.createdAt), 'MMM d, yyyy h:mm a')}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>

                    <div
                        className="prose prose-slate max-w-none text-slate-700 mb-6"
                        dangerouslySetInnerHTML={{ __html: reply.content }}
                    />

                    <div className="flex items-center gap-6 pt-4 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 h-8 hover:bg-slate-50 flex items-center gap-2"
                            onClick={() => {
                                setReplyToId(reply.id);
                                setReplyContent('');
                            }}
                        >
                            <ReplyIcon className="w-4 h-4 rotate-180" />
                            Reply
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 flex items-center gap-2", hasLiked ? "text-blue-600" : "text-slate-500")}
                            onClick={() => user && toggleLike(reply.id, user.id)}
                        >
                            <ThumbsUp className={cn("w-4 h-4", hasLiked && "fill-current")} />
                            {reply.likes.length > 0 && <span>({reply.likes.length} likes)</span>}
                        </Button>
                    </div>

                    {isEditing && (
                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <TinyMCEEditor
                                value={replyContent}
                                onChange={setReplyContent}
                                height={200}
                                placeholder="Write a reply..."
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setReplyToId(null)}>Cancel</Button>
                                <Button size="sm" className="bg-blue-600" onClick={() => handlePostReply(reply.id)}>Post Reply</Button>
                            </div>
                        </div>
                    )}
                </div>

                {childReplies.map(child => (
                    <ReplyItem key={child.id} reply={child} depth={depth + 1} />
                ))}
            </div>
        );
    };

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 py-6 font-sans bg-white min-h-screen">
            <Button
                variant="ghost"
                className="mb-6 -ml-2 text-slate-500 hover:text-blue-600"
                onClick={() => navigate(`/teacher/subjects/${subjectId}/discussions`)}
            >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Discussions
            </Button>

            {/* Topic Header */}
            <div className="border rounded-sm mb-8 overflow-hidden shadow-sm">
                <div className="p-8 bg-white">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-6 items-center">
                            <Avatar className="w-16 h-16 border-2 border-slate-100 shadow-sm">
                                <AvatarImage src={discussion.authorAvatar} />
                                <AvatarFallback className="bg-blue-600 text-white font-bold text-xl">
                                    {discussion.authorName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl font-bold text-blue-600 mb-1">{discussion.title}</h1>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-700">{discussion.authorName}</span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-500">{format(new Date(discussion.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant={isSubscribed ? "secondary" : "outline"}
                                className={cn("h-10", isSubscribed && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100")}
                                onClick={() => user && toggleSubscription(discussion.id, user.id)}
                            >
                                <CheckCircle className={cn("w-4 h-4 mr-2", isSubscribed ? "text-green-600" : "text-slate-300")} />
                                {isSubscribed ? "Subscribed" : "Subscribe"}
                            </Button>
                            <Button variant="outline" size="icon" className="h-10 w-10">
                                <Settings className="w-4 h-4 text-slate-600" />
                            </Button>
                        </div>
                    </div>

                    <div
                        className="prose prose-lg dark:prose-invert max-w-none text-slate-800 mb-10 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: discussion.content }}
                    />

                    {!discussion.isClosed && (
                        <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-10">
                            <Button
                                variant="outline"
                                className="h-10 px-8 text-blue-600 border-blue-200 hover:bg-blue-50 font-bold"
                                onClick={() => setIsTopicReplyOpen(true)}
                            >
                                <ReplyIcon className="w-4 h-4 mr-2 rotate-180" />
                                Reply
                            </Button>
                        </div>
                    )}
                </div>
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
                            <ReplyItem key={reply.id} reply={reply} />
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

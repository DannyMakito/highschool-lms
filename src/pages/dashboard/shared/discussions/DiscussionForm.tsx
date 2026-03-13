import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import TinyMCEEditor from '@/components/shared/TinyMCEEditor';
import { Calendar as CalendarIcon, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const DiscussionForm: React.FC = () => {
    const { id: subjectId, discussionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { discussions, addDiscussion, updateDiscussion } = useDiscussions(subjectId);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        isPinned: false,
        requirePostBeforeView: false,
        allowThreadedReplies: true,
        allowLiking: false,
        isGroup: false,
        availableFrom: new Date().toISOString().split('T')[0],
        availableUntil: '',
    });

    useEffect(() => {
        if (discussionId) {
            const existing = discussions.find(d => d.id === discussionId);
            if (existing) {
                setFormData({
                    title: existing.title,
                    content: existing.content,
                    isPinned: existing.isPinned,
                    requirePostBeforeView: existing.requirePostBeforeView,
                    allowThreadedReplies: existing.allowThreadedReplies,
                    allowLiking: existing.allowLiking,
                    isGroup: existing.isGroup,
                    availableFrom: existing.availableFrom.split('T')[0],
                    availableUntil: existing.availableUntil ? existing.availableUntil.split('T')[0] : '',
                });
            }
        }
    }, [discussionId, discussions]);

    const handleSave = () => {
        if (!formData.title) {
            toast.error('Title is required');
            return;
        }

        const data = {
            ...formData,
            subjectId: subjectId!,
            authorId: user?.id || '1',
            authorName: user?.name || 'Instructor',
            authorRole: user?.role || 'teacher',
            isClosed: false,
        };

        if (discussionId) {
            updateDiscussion(discussionId, data);
            toast.success('Discussion updated');
        } else {
            addDiscussion(data);
            toast.success('Discussion created');
        }

        navigate(`/teacher/subjects/${subjectId}/discussions`);
    };

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 py-6 font-sans">
            <header className="flex items-center justify-between mb-8 border-b pb-4">
                <h1 className="text-2xl font-bold text-slate-800">
                    {discussionId ? 'Edit Discussion' : 'Create New Discussion'}
                </h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save & Publish
                    </Button>
                </div>
            </header>

            <div className="space-y-8">
                <div className="space-y-2">
                    <Input
                        placeholder="Topic Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="text-lg font-semibold h-12 border-slate-300"
                    />
                </div>

                <div className="space-y-2">
                    <TinyMCEEditor
                        value={formData.content}
                        onChange={(content) => setFormData({ ...formData, content })}
                        placeholder="Enter discussion content here..."
                    />
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700 border-b pb-1">Options</h3>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="threaded"
                                        checked={formData.allowThreadedReplies}
                                        onCheckedChange={(checked) => setFormData({ ...formData, allowThreadedReplies: !!checked })}
                                    />
                                    <Label htmlFor="threaded" className="text-slate-600 font-normal">Allow threaded replies</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="post-before"
                                        checked={formData.requirePostBeforeView}
                                        onCheckedChange={(checked) => setFormData({ ...formData, requirePostBeforeView: !!checked })}
                                    />
                                    <Label htmlFor="post-before" className="text-slate-600 font-normal">Users must post before seeing replies</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="liking"
                                        checked={formData.allowLiking}
                                        onCheckedChange={(checked) => setFormData({ ...formData, allowLiking: !!checked })}
                                    />
                                    <Label htmlFor="liking" className="text-slate-600 font-normal">Allow liking</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="pinned"
                                        checked={formData.isPinned}
                                        onCheckedChange={(checked) => setFormData({ ...formData, isPinned: !!checked })}
                                    />
                                    <Label htmlFor="pinned" className="text-slate-600 font-normal">Pin this discussion</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700 border-b pb-1">Group Discussion</h3>
                            <Card className="bg-slate-50 border-slate-200">
                                <CardContent className="pt-6">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="is-group"
                                            checked={formData.isGroup}
                                            onCheckedChange={(checked) => setFormData({ ...formData, isGroup: !!checked })}
                                        />
                                        <Label htmlFor="is-group" className="text-slate-600 font-normal">This is a Group Discussion</Label>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 border-b pb-1">Availability</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-500">Available From</Label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={formData.availableFrom}
                                        onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                                        className="pl-10"
                                    />
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-500">Until</Label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={formData.availableUntil}
                                        onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                                        className="pl-10"
                                    />
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                    <Button variant="outline" className="px-8" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 px-8" onClick={handleSave}>
                        {discussionId ? 'Update' : 'Save & Publish'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DiscussionForm;

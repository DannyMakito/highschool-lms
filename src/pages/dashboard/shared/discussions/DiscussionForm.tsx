import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/context/AuthContext';
import { useSubjects } from '@/hooks/useSubjects';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { useSchoolData } from '@/hooks/useSchoolData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import TinyMCEEditor from '@/components/shared/TinyMCEEditor';
import { Calendar as CalendarIcon, Save, X, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getRolePathPrefix } from '@/lib/role-path';

const DiscussionForm: React.FC = () => {
    const { id: subjectId, discussionId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const { subjects } = useSubjects();
    const { studentSubjectClasses, subjectClasses } = useRegistrationData();
    const { classes } = useSchoolData();
    const { discussions, addDiscussion, updateDiscussion } = useDiscussions(subjectId);
    const rolePrefix = getRolePathPrefix(role);

    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectId || '');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

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
                setSelectedGroupId(existing.groupId || 'all');
            }
        }
    }, [discussionId, discussions]);

    const availableSubjects = React.useMemo(() => {
        if (role !== 'learner' || !user) return subjects;
        const allowedSubjectIds = new Set(
            studentSubjectClasses
                .filter((item) => item.studentId === user.id)
                .map((item) => subjectClasses.find((subjectClass) => subjectClass.id === item.subjectClassId)?.subjectId)
                .filter(Boolean)
        );
        return subjects.filter((subject) => allowedSubjectIds.has(subject.id));
    }, [role, studentSubjectClasses, subjectClasses, subjects, user]);

    const teacherClassOptions = React.useMemo(() => {
        const targetSubjectId = subjectId || selectedSubjectId;
        if (!targetSubjectId || !user) return [];
        if (role === 'teacher') {
            return classes.filter((item) => item.teacherId === user.id && item.subjectId === targetSubjectId);
        }
        if (role === 'principal') {
            return subjectClasses.filter((item) => item.subjectId === targetSubjectId);
        }
        return [];
    }, [classes, role, selectedSubjectId, subjectClasses, subjectId, user]);

    const learnerGroupId = React.useMemo(() => {
        const targetSubjectId = subjectId || selectedSubjectId;
        if (!targetSubjectId || !user) return '';
        const membership = studentSubjectClasses.find((item) => {
            if (item.studentId !== user.id) return false;
            const subjectClass = subjectClasses.find((candidate) => candidate.id === item.subjectClassId);
            return subjectClass?.subjectId === targetSubjectId;
        });
        return membership?.subjectClassId || '';
    }, [selectedSubjectId, studentSubjectClasses, subjectClasses, subjectId, user]);

    useEffect(() => {
        if (discussionId) return;
        if (role === 'learner') {
            setSelectedGroupId(learnerGroupId || 'all');
            return;
        }
        if (teacherClassOptions.length === 1) {
            setSelectedGroupId(teacherClassOptions[0].id);
            return;
        }
        setSelectedGroupId('all');
    }, [discussionId, learnerGroupId, role, teacherClassOptions]);

    const handleSave = () => {
        const finalSubjectId = subjectId || selectedSubjectId;

        if (!finalSubjectId) {
            toast.error('Please select a subject');
            return;
        }

        if (role === 'learner' && !learnerGroupId) {
            toast.error('You are not linked to a visible subject class for this subject yet.');
            return;
        }

        const finalGroupId = role === 'learner'
            ? learnerGroupId
            : (selectedGroupId !== 'all' ? selectedGroupId : undefined);

        const data = {
            ...formData,
            subjectId: finalSubjectId,
            groupId: finalGroupId,
            authorId: user?.id || '1',
            authorName: user?.name || 'Instructor',
            authorRole: user?.role || 'teacher',
            isClosed: false,
            isGroup: role === 'learner' ? true : Boolean(finalGroupId),
        };

        if (discussionId) {
            updateDiscussion(discussionId, data);
            toast.success('Discussion updated');
        } else {
            addDiscussion(data);
            toast.success('Discussion created');
        }

        navigate(`${rolePrefix}/subjects/${finalSubjectId}/discussions`);
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
                {!subjectId && !discussionId && (
                    <div className="space-y-2 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <Label className="text-sm font-bold text-blue-900 uppercase tracking-widest">Select Subject</Label>
                        </div>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                            <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl font-medium">
                                <SelectValue placeholder="Which subject is this discussion for?" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                {availableSubjects.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="rounded-lg">
                                        {s.name} (Grade {s.gradeTier})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 font-medium">
                            {role === 'learner'
                                ? 'Your post will stay transparent inside your linked subject class.'
                                : 'This discussion can be shared with the whole subject or a specific class group.'}
                        </p>
                    </div>
                )}

                {(role === 'teacher' || role === 'principal') && (subjectId || selectedSubjectId) ? (
                    <div className="space-y-2 bg-slate-50 p-6 rounded-2xl border border-slate-200/70">
                        <Label className="text-sm font-bold text-slate-700">Class Group Visibility</Label>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl font-medium">
                                <SelectValue placeholder="Choose who can see this discussion" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                <SelectItem value="all">All classes in this subject</SelectItem>
                                {teacherClassOptions.map((subjectClass) => (
                                    <SelectItem key={subjectClass.id} value={subjectClass.id}>
                                        {subjectClass.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

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
                                        disabled={role === 'learner'}
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
                                            checked={role === 'learner' ? true : formData.isGroup}
                                            disabled={role === 'learner'}
                                            onCheckedChange={(checked) => setFormData({ ...formData, isGroup: !!checked })}
                                        />
                                        <Label htmlFor="is-group" className="text-slate-600 font-normal">
                                            {role === 'learner' ? 'Learner discussions stay inside the linked class group' : 'This is a Group Discussion'}
                                        </Label>
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

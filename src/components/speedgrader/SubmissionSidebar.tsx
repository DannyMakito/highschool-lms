/**
 * SubmissionSidebar — Left panel listing all submissions for an assignment.
 */
import React from 'react';
import type { AssignmentSubmission } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmissionSidebarProps {
    submissions: AssignmentSubmission[];
    selectedId: string | null;
    totalMarks: number;
    onSelect: (id: string) => void;
}

export default function SubmissionSidebar({
    submissions,
    selectedId,
    totalMarks,
    onSelect,
}: SubmissionSidebarProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'graded':
                return <CheckCircle className="h-3 w-3 text-emerald-500" />;
            case 'submitted':
                return <Clock className="h-3 w-3 text-amber-500" />;
            default:
                return <AlertCircle className="h-3 w-3 text-slate-400" />;
        }
    };

    return (
        <div className="w-48 border-r bg-slate-50/50 flex flex-col shrink-0">
            {/* Header */}
            <div className="p-4 border-b bg-white">
                <h2 className="font-black text-xs uppercase tracking-widest text-slate-400">
                    Submissions
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">{submissions.length}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Students</span>
                </div>
                <div className="flex gap-3 mt-2 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle className="h-3 w-3" />
                        {submissions.filter((s) => s.status === 'graded').length}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Clock className="h-3 w-3" />
                        {submissions.filter((s) => s.status === 'submitted').length}
                    </span>
                </div>
            </div>

            {/* Submission list */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {submissions.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => onSelect(s.id)}
                            className={cn(
                                'w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1',
                                selectedId === s.id
                                    ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                                    : 'hover:bg-white bg-transparent'
                            )}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="font-bold text-sm truncate max-w-[120px]">
                                    {s.studentName}
                                </span>
                                {getStatusIcon(s.status)}
                            </div>
                            <span
                                className={cn(
                                    'text-[10px] font-medium',
                                    selectedId === s.id
                                        ? 'text-primary-foreground/70'
                                        : 'text-slate-400'
                                )}
                            >
                                {s.status === 'graded'
                                    ? `${s.totalGrade}/${totalMarks}`
                                    : s.status === 'submitted'
                                    ? 'Needs grading'
                                    : 'Pending'}
                            </span>
                            <span
                                className={cn(
                                    'text-[9px] font-medium',
                                    selectedId === s.id
                                        ? 'text-primary-foreground/50'
                                        : 'text-slate-300'
                                )}
                            >
                                {new Date(s.submittedAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </button>
                    ))}

                    {submissions.length === 0 && (
                        <div className="py-8 text-center">
                            <p className="text-xs text-slate-400 italic">No submissions yet</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

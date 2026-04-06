/**
 * GradingSidebar — Right panel with rubric scoring, feedback, and actions.
 */
import React, { useMemo } from 'react';
import type { RubricCriterion } from '@/types';
import type { CriterionGrade, AnnotationData } from '@/types/speedgrader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
// Removed ScrollArea
import {
    FileText,
    MessageSquare,
    Save,
    CheckCircle,
    LinkIcon,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradingSidebarProps {
    rubricCriteria: RubricCriterion[];
    criterionGrades: CriterionGrade[];
    annotations: AnnotationData[];
    overallFeedback: string;
    totalMarks: number;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    onCriterionGradeChange: (criterionId: string, score: number, feedback?: string) => void;
    onFeedbackChange: (feedback: string) => void;
    onSaveDraft: () => void;
    onSubmitRelease: () => void;
}

export default function GradingSidebar({
    rubricCriteria,
    criterionGrades,
    annotations,
    overallFeedback,
    totalMarks,
    isSaving,
    hasUnsavedChanges,
    onCriterionGradeChange,
    onFeedbackChange,
    onSaveDraft,
    onSubmitRelease,
}: GradingSidebarProps) {
    const totalGrade = useMemo(
        () => criterionGrades.reduce((sum, g) => sum + (Number.isNaN(g.score) ? 0 : g.score), 0),
        [criterionGrades]
    );

    const percentage = totalMarks > 0 ? Math.round((totalGrade / totalMarks) * 100) : 0;

    const getGradeForCriterion = (criterionId: string): number => {
        return criterionGrades.find((g) => g.criterion_id === criterionId)?.score ?? 0;
    };

    const getLinkedAnnotations = (criterionId: string): AnnotationData[] => {
        return annotations.filter((a) => a.rubric_criterion_id === criterionId);
    };

    return (
        <div className="w-72 border-l bg-white flex flex-col shrink-0 h-full overflow-hidden">
            {/* Score header */}
            <header className="p-4 border-b bg-white shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="font-black text-sm uppercase tracking-wider text-slate-600">Grading</h2>
                    <Badge
                        variant="outline"
                        className={cn(
                            'font-black text-lg px-3 py-1 tabular-nums',
                            percentage >= 75 ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                            percentage >= 50 ? 'border-amber-300 text-amber-700 bg-amber-50' :
                            'border-red-300 text-red-700 bg-red-50'
                        )}
                    >
                        {totalGrade} / {totalMarks}
                    </Badge>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-500',
                            percentage >= 75 ? 'bg-emerald-500' :
                            percentage >= 50 ? 'bg-amber-500' :
                            'bg-red-500'
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1 text-right">{percentage}%</p>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 space-y-6">
                    {/* Rubric Criteria */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <FileText className="h-3 w-3" />
                                Rubric Scoring
                            </h3>
                            <Badge variant="secondary" className="text-[10px] h-5 font-bold">
                                {rubricCriteria.length} Criteria
                            </Badge>
                        </div>

                        {rubricCriteria.length > 0 ? (
                            <div className="space-y-3">
                                {rubricCriteria.map((c) => {
                                    const score = getGradeForCriterion(c.id);
                                    const linked = getLinkedAnnotations(c.id);
                                    const maxPts = c.maxPoints || (c as any).points || 10;
                                    const pct = maxPts > 0 ? Math.round(((Number.isNaN(score) ? 0 : score) / maxPts) * 100) : 0;

                                    return (
                                        <div
                                            key={c.id}
                                            className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all space-y-3"
                                        >
                                            <div className="space-y-1">
                                                <Label className="font-bold text-xs text-slate-800">{c.title}</Label>
                                                <p className="text-[10px] text-slate-400 leading-relaxed">{c.description}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="h-9 text-sm font-black flex-1 text-center"
                                                    value={Number.isNaN(score) ? '' : score}
                                                    min={0}
                                                    max={maxPts}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        onCriterionGradeChange(
                                                            c.id,
                                                            Number.isNaN(val) ? NaN : Math.min(val, maxPts)
                                                        );
                                                    }}
                                                />
                                                <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">
                                                    / {maxPts}
                                                </span>
                                            </div>

                                            {/* Mini progress */}
                                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            {/* Linked annotations */}
                                            {linked.length > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                                                    <LinkIcon className="h-3 w-3" />
                                                    {linked.length} linked annotation{linked.length !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-[10px] p-6 text-center border-2 border-dashed rounded-2xl text-slate-400 bg-slate-50/50">
                                No rubric attached to this assignment.
                            </div>
                        )}
                    </section>

                    <Separator />

                    {/* Overall Feedback */}
                    <section className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3" />
                            Summary Feedback
                        </h3>
                        <Textarea
                            className="min-h-[120px] text-sm leading-relaxed bg-slate-50 border-slate-100 focus:border-primary/30"
                            placeholder="Write your summary observation..."
                            value={overallFeedback}
                            onChange={(e) => onFeedbackChange(e.target.value)}
                        />
                    </section>
                </div>
            </div>

            {/* Actions */}
            <footer className="p-4 border-t bg-slate-50/50 space-y-2 shrink-0">
                {hasUnsavedChanges && (
                    <p className="text-[10px] text-amber-600 font-bold text-center animate-pulse">
                        ● Unsaved changes
                    </p>
                )}
                <Button
                    onClick={onSaveDraft}
                    variant="ghost"
                    className="w-full font-bold gap-2 text-xs h-9"
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Draft
                </Button>
                <Button
                    onClick={onSubmitRelease}
                    className="w-full font-black gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Submit & Release
                </Button>
            </footer>
        </div>
    );
}

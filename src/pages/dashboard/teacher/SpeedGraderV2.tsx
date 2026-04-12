/**
 * SpeedGraderV2 — Canvas-style SpeedGrader with decoupled annotation overlay.
 *
 * Architecture:
 * ┌─────────────┬─────────────────────────────────┬──────────────┐
 * │ Submissions │    Document + Overlay + Gutter    │   Grading    │
 * │   Sidebar   │         (3-layer stack)           │   Sidebar    │
 * │   (48px)    │              (flex-1)             │   (320px)    │
 * └─────────────┴─────────────────────────────────┴──────────────┘
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssignments } from '@/hooks/useAssignments';
import { useAuth } from '@/context/AuthContext';
import { useSpeedGraderState } from '@/hooks/useSpeedGraderState';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useDocumentLoader } from '@/hooks/useDocumentLoader';
import { useCriterionGrades } from '@/hooks/useCriterionGrades';
import {
    batchSaveAnnotations,
    batchSaveCriterionGrades,
    updateSubmissionGradeStatus,
    insertAnnotation,
    updateAnnotation as apiUpdateAnnotation,
    deleteAnnotation as apiDeleteAnnotation,
} from '@/lib/speedgrader-api';
import type { AnnotationData } from '@/types/speedgrader';

import SubmissionSidebar from '@/components/speedgrader/SubmissionSidebar';
import AnnotationToolbar from '@/components/speedgrader/AnnotationToolbar';
import PdfDocumentViewer from '@/components/speedgrader/PdfDocumentViewer';
import TextDocumentViewer from '@/components/speedgrader/TextDocumentViewer';
import AnnotationGutter from '@/components/speedgrader/AnnotationGutter';
import GradingSidebar from '@/components/speedgrader/GradingSidebar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SpeedGraderV2() {
    const { id: assignmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { assignments, getAssignmentSubmissions, getRubric, updateGrade } = useAssignments();

    const assignment = assignments.find((a) => a.id === assignmentId);
    const allSubmissions = getAssignmentSubmissions(assignmentId || '');
    const rubric = getRubric(assignment?.rubricId);

    // ── State Machine ──
    const {
        state,
        setSubmission,
        setPage,
        setTotalPages,
        setZoom,
        setTool,
        setColor,
        setAnnotations,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        setCriterionGrades,
        updateCriterionGrade,
        setFeedback,
        setSaving,
        markSaved,
        toggleFullscreen,
    } = useSpeedGraderState();

    // Select first submission by default
    useEffect(() => {
        if (allSubmissions.length > 0 && !state.currentSubmissionId) {
            setSubmission(allSubmissions[0].id);
        }
    }, [allSubmissions, state.currentSubmissionId, setSubmission]);

    const currentSubmission = allSubmissions.find((s) => s.id === state.currentSubmissionId);

    // Load existing overall feedback when switching submissions
    useEffect(() => {
        if (currentSubmission) {
            setFeedback(currentSubmission.overallFeedback || '');
        }
    }, [state.currentSubmissionId, currentSubmission]);

    // ── Annotations Hook ──
    const { createAnnotation, editAnnotation, removeAnnotation } = useAnnotations({
        submissionId: state.currentSubmissionId,
        onAnnotationsLoaded: setAnnotations,
        onAnnotationInserted: (ann) => {
            // Only add if not already in state (from local creation)
            if (!state.annotations.find((a) => a.id === ann.id)) {
                addAnnotation(ann);
            }
        },
        onAnnotationUpdated: updateAnnotation,
        onAnnotationDeleted: deleteAnnotation,
    });

    // ── Document Loader ──
    const { resolvedUrl, isLoading: isDocLoading } = useDocumentLoader({
        content: currentSubmission?.content ?? null,
        fileType: currentSubmission?.fileType ?? null,
    });

    // ── Criterion Grades Hook ──
    const { saveAllGrades } = useCriterionGrades({
        submissionId: state.currentSubmissionId,
        onGradesLoaded: setCriterionGrades,
    });

    // ── Annotation Creation Handler ──
    const handleAnnotationCreated = useCallback(
        async (partial: Partial<AnnotationData>) => {
            if (!state.currentSubmissionId || !user) return;

            try {
                const created = await insertAnnotation({
                    ...partial,
                    submission_id: state.currentSubmissionId,
                    author_id: user.id,
                    is_resolved: false,
                } as any);

                addAnnotation(created);

                // If it's a comment, show a toast
                if (partial.annotation_type === 'text_comment') {
                    toast.success('💬 Comment pin placed — click it to add text');
                }
            } catch (err) {
                console.error('[SpeedGraderV2] Failed to create annotation:', err);
                toast.error('Failed to save annotation');
            }
        },
        [state.currentSubmissionId, user, addAnnotation]
    );

    // ── Annotation Update Handler ──
    const handleAnnotationUpdated = useCallback(
        async (partial: Partial<AnnotationData>) => {
            if (!partial.id) return;
            try {
                const updated = await apiUpdateAnnotation(partial.id, partial);
                updateAnnotation(updated);
            } catch (err) {
                console.error('[SpeedGraderV2] Failed to update annotation:', err);
            }
        },
        [updateAnnotation]
    );

    // ── Annotation Delete Handler ──
    const handleAnnotationDeleted = useCallback(
        async (id: string) => {
            try {
                await apiDeleteAnnotation(id);
                deleteAnnotation(id);
                toast.success('Annotation removed');
            } catch (err) {
                console.error('[SpeedGraderV2] Failed to delete annotation:', err);
                toast.error('Failed to remove annotation');
            }
        },
        [deleteAnnotation]
    );

    // ── Comment Click Handler ──
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const handleCommentClick = useCallback((ann: AnnotationData) => {
        setActiveCommentId(ann.id);
        // The gutter will show this comment for editing
    }, []);

    // ── Gutter Update Handler ──
    const handleGutterUpdate = useCallback(
        async (id: string, updates: Partial<AnnotationData>) => {
            try {
                const updated = await apiUpdateAnnotation(id, updates);
                updateAnnotation(updated);
            } catch (err) {
                console.error('[SpeedGraderV2] Failed to update annotation text:', err);
            }
        },
        [updateAnnotation]
    );

    // ── Save Draft ──
    const handleSaveDraft = useCallback(async () => {
        if (!state.currentSubmissionId || !user) return;

        setSaving(true);
        try {
            // Save criterion grades
            const gradesToSave = state.criterionGrades.map((g) => ({
                submission_id: state.currentSubmissionId!,
                criterion_id: g.criterion_id,
                score: g.score,
                feedback: g.feedback,
                graded_by: user.id,
            }));
            await saveAllGrades(gradesToSave);

            // Update submission metadata
            const totalGrade = state.criterionGrades.reduce((sum, g) => sum + g.score, 0);
            await updateGrade(state.currentSubmissionId, {
                status: 'submitted', // keep as submitted (draft)
                overallFeedback: state.overallFeedback,
                totalGrade: totalGrade,
            });

            markSaved();
            toast.success('💾 Draft saved');
        } catch (err) {
            console.error('[SpeedGraderV2] Save draft failed:', err);
            toast.error('Failed to save draft');
        } finally {
            setSaving(false);
        }
    }, [state, user, saveAllGrades, markSaved, setSaving]);

    // ── Submit & Release ──
    const handleSubmitRelease = useCallback(async () => {
        if (!state.currentSubmissionId || !user) return;

        setSaving(true);
        try {
            const gradesToSave = state.criterionGrades.map((g) => ({
                submission_id: state.currentSubmissionId!,
                criterion_id: g.criterion_id,
                score: g.score,
                feedback: g.feedback,
                graded_by: user.id,
            }));
            await saveAllGrades(gradesToSave);

            const totalGrade = state.criterionGrades.reduce((sum, g) => sum + g.score, 0);
            await updateGrade(state.currentSubmissionId, {
                status: 'graded',
                isReleased: true,
                overallFeedback: state.overallFeedback,
                totalGrade: totalGrade,
            });

            markSaved();
            toast.success('✅ Grade released to student');
        } catch (err) {
            console.error('[SpeedGraderV2] Release failed:', err);
            toast.error('Failed to release grade');
        } finally {
            setSaving(false);
        }
    }, [state, user, saveAllGrades, markSaved, setSaving]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'v': setTool('select'); break;
                case 'h': setTool('highlight'); break;
                case 'd': setTool('draw'); break;
                case 'c': setTool('comment'); break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleSaveDraft();
                    } else {
                        setTool('strikethrough');
                    }
                    break;
                case 'e': setTool('eraser'); break;
                case 'arrowleft':
                    if (state.currentPageNumber > 1) setPage(state.currentPageNumber - 1);
                    break;
                case 'arrowright':
                    if (state.currentPageNumber < state.totalPages) setPage(state.currentPageNumber + 1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [state.currentPageNumber, state.totalPages, handleSaveDraft, setTool, setPage]);

    if (!assignment) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <p className="text-slate-400">Assignment not found</p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex w-full overflow-hidden bg-slate-100 border rounded-xl shadow-inner',
                state.isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'h-[calc(100vh-110px)]'
            )}
        >
            {/* LEFT: Submissions Sidebar */}
            <SubmissionSidebar
                submissions={allSubmissions}
                selectedId={state.currentSubmissionId}
                totalMarks={assignment.totalMarks}
                onSelect={setSubmission}
            />

            {/* CENTER: Document Viewer + Toolbar + Gutter */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header bar */}
                <header className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 text-xs">
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <Separator orientation="vertical" className="h-5" />
                        <h1 className="font-bold text-sm text-slate-800 truncate max-w-[300px]">
                            {assignment.title}
                        </h1>
                        {currentSubmission && (
                            <>
                                <Separator orientation="vertical" className="h-5" />
                                <span className="text-xs text-slate-500">
                                    <span className="font-bold text-slate-700">{currentSubmission.studentName}</span>{' '}
                                    · {currentSubmission.fileType?.toUpperCase()} submission
                                </span>
                            </>
                        )}
                    </div>
                </header>

                {/* Toolbar */}
                <AnnotationToolbar
                    activeTool={state.activeTool}
                    activeColor={state.activeColor}
                    currentPage={state.currentPageNumber}
                    totalPages={state.totalPages}
                    zoomLevel={state.zoomLevel}
                    isFullscreen={state.isFullscreen}
                    onToolChange={setTool}
                    onColorChange={setColor}
                    onPageChange={setPage}
                    onZoomChange={setZoom}
                    onToggleFullscreen={toggleFullscreen}
                />

                {/* Document + Gutter area */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Document viewer */}
                    <div className="flex-1 overflow-auto flex items-start justify-center overflow-x-hidden">
                        {currentSubmission ? (
                            currentSubmission.fileType === 'pdf' && resolvedUrl ? (
                                <PdfDocumentViewer
                                    pdfUrl={resolvedUrl}
                                    pageNumber={state.currentPageNumber}
                                    scale={state.zoomLevel}
                                    annotations={state.annotations}
                                    activeTool={state.activeTool}
                                    activeColor={state.activeColor}
                                    onDocumentLoaded={setTotalPages}
                                    onAnnotationCreated={handleAnnotationCreated}
                                    onAnnotationUpdated={handleAnnotationUpdated}
                                    onAnnotationDeleted={handleAnnotationDeleted}
                                    onCommentClick={handleCommentClick}
                                />
                            ) : (
                                <TextDocumentViewer
                                    content={currentSubmission.content}
                                    annotations={state.annotations}
                                    activeTool={state.activeTool}
                                    activeColor={state.activeColor}
                                    onAnnotationCreated={handleAnnotationCreated}
                                    onAnnotationDeleted={handleAnnotationDeleted}
                                    onCommentClick={handleCommentClick}
                                />
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                                <EyeOff className="h-16 w-16 mb-4 opacity-10" />
                                <p className="font-medium text-sm">Select a submission to start grading</p>
                                <p className="text-xs text-slate-300 mt-1">
                                    Choose a student from the sidebar
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Annotation Gutter */}
                    {currentSubmission && (
                        <AnnotationGutter
                            annotations={state.annotations}
                            currentPage={state.currentPageNumber}
                            onAnnotationUpdate={handleGutterUpdate}
                            onAnnotationDelete={handleAnnotationDeleted}
                        />
                    )}
                </div>
            </div>

            {/* RIGHT: Grading Sidebar */}
            <GradingSidebar
                rubricCriteria={rubric?.criteria || []}
                criterionGrades={state.criterionGrades}
                annotations={state.annotations}
                overallFeedback={state.overallFeedback}
                totalMarks={assignment.totalMarks}
                isSaving={state.isSaving}
                hasUnsavedChanges={state.hasUnsavedChanges}
                onCriterionGradeChange={updateCriterionGrade}
                onFeedbackChange={setFeedback}
                onSaveDraft={handleSaveDraft}
                onSubmitRelease={handleSubmitRelease}
            />
        </div>
    );
}

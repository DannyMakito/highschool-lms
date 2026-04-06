/**
 * useSpeedGraderState — Central state machine for the SpeedGrader UI.
 * Uses useReducer for predictable state transitions.
 */
import { useReducer, useCallback } from 'react';
import type {
    SpeedGraderState,
    SpeedGraderAction,
    AnnotationData,
    CriterionGrade,
    AnnotationTool,
} from '@/types/speedgrader';

const initialState: SpeedGraderState = {
    currentSubmissionId: null,
    currentPageNumber: 1,
    totalPages: 1,
    zoomLevel: 1.2,
    activeTool: 'select',
    activeColor: '#FFEB3B',
    annotations: [],
    criterionGrades: [],
    overallFeedback: '',
    isSaving: false,
    hasUnsavedChanges: false,
    isFullscreen: false,
};

function speedGraderReducer(state: SpeedGraderState, action: SpeedGraderAction): SpeedGraderState {
    switch (action.type) {
        case 'SET_SUBMISSION':
            return {
                ...state,
                currentSubmissionId: action.submissionId,
                currentPageNumber: 1,
                annotations: [],
                criterionGrades: [],
                overallFeedback: '',
                hasUnsavedChanges: false,
            };

        case 'SET_PAGE':
            return { ...state, currentPageNumber: action.page };

        case 'SET_TOTAL_PAGES':
            return { ...state, totalPages: action.total };

        case 'SET_ZOOM':
            return { ...state, zoomLevel: action.zoom };

        case 'SET_TOOL':
            return { ...state, activeTool: action.tool };

        case 'SET_COLOR':
            return { ...state, activeColor: action.color };

        case 'SET_ANNOTATIONS':
            return { ...state, annotations: action.annotations };

        case 'ADD_ANNOTATION':
            if (state.annotations.some((a) => a.id === action.annotation.id)) {
                return state;
            }
            return {
                ...state,
                annotations: [...state.annotations, action.annotation],
                hasUnsavedChanges: true,
            };

        case 'UPDATE_ANNOTATION':
            return {
                ...state,
                annotations: state.annotations.map((a) =>
                    a.id === action.annotation.id ? action.annotation : a
                ),
                hasUnsavedChanges: true,
            };

        case 'DELETE_ANNOTATION':
            return {
                ...state,
                annotations: state.annotations.filter((a) => a.id !== action.annotationId),
                hasUnsavedChanges: true,
            };

        case 'SET_CRITERION_GRADES':
            return { ...state, criterionGrades: action.grades };

        case 'UPDATE_CRITERION_GRADE': {
            const existing = state.criterionGrades.find(
                (g) => g.criterion_id === action.criterionId
            );
            if (existing) {
                return {
                    ...state,
                    criterionGrades: state.criterionGrades.map((g) =>
                        g.criterion_id === action.criterionId
                            ? { ...g, score: action.score, feedback: action.feedback ?? g.feedback }
                            : g
                    ),
                    hasUnsavedChanges: true,
                };
            }
            return {
                ...state,
                criterionGrades: [
                    ...state.criterionGrades,
                    {
                        id: crypto.randomUUID(),
                        submission_id: state.currentSubmissionId!,
                        criterion_id: action.criterionId,
                        score: action.score,
                        feedback: action.feedback,
                    },
                ],
                hasUnsavedChanges: true,
            };
        }

        case 'SET_FEEDBACK':
            return { ...state, overallFeedback: action.feedback, hasUnsavedChanges: true };

        case 'SET_SAVING':
            return { ...state, isSaving: action.saving };

        case 'MARK_SAVED':
            return { ...state, hasUnsavedChanges: false, isSaving: false };

        case 'TOGGLE_FULLSCREEN':
            return { ...state, isFullscreen: !state.isFullscreen };

        default:
            return state;
    }
}

export function useSpeedGraderState() {
    const [state, dispatch] = useReducer(speedGraderReducer, initialState);

    // Convenience dispatchers
    const setSubmission = useCallback(
        (id: string | null) => dispatch({ type: 'SET_SUBMISSION', submissionId: id }),
        []
    );
    const setPage = useCallback((p: number) => dispatch({ type: 'SET_PAGE', page: p }), []);
    const setTotalPages = useCallback(
        (t: number) => dispatch({ type: 'SET_TOTAL_PAGES', total: t }),
        []
    );
    const setZoom = useCallback((z: number) => dispatch({ type: 'SET_ZOOM', zoom: z }), []);
    const setTool = useCallback(
        (t: AnnotationTool) => dispatch({ type: 'SET_TOOL', tool: t }),
        []
    );
    const setColor = useCallback((c: string) => dispatch({ type: 'SET_COLOR', color: c }), []);
    const setAnnotations = useCallback(
        (a: AnnotationData[]) => dispatch({ type: 'SET_ANNOTATIONS', annotations: a }),
        []
    );
    const addAnnotation = useCallback(
        (a: AnnotationData) => dispatch({ type: 'ADD_ANNOTATION', annotation: a }),
        []
    );
    const updateAnnotation = useCallback(
        (a: AnnotationData) => dispatch({ type: 'UPDATE_ANNOTATION', annotation: a }),
        []
    );
    const deleteAnnotation = useCallback(
        (id: string) => dispatch({ type: 'DELETE_ANNOTATION', annotationId: id }),
        []
    );
    const setCriterionGrades = useCallback(
        (g: CriterionGrade[]) => dispatch({ type: 'SET_CRITERION_GRADES', grades: g }),
        []
    );
    const updateCriterionGrade = useCallback(
        (criterionId: string, score: number, feedback?: string) =>
            dispatch({ type: 'UPDATE_CRITERION_GRADE', criterionId, score, feedback }),
        []
    );
    const setFeedback = useCallback(
        (f: string) => dispatch({ type: 'SET_FEEDBACK', feedback: f }),
        []
    );
    const setSaving = useCallback(
        (s: boolean) => dispatch({ type: 'SET_SAVING', saving: s }),
        []
    );
    const markSaved = useCallback(() => dispatch({ type: 'MARK_SAVED' }), []);
    const toggleFullscreen = useCallback(() => dispatch({ type: 'TOGGLE_FULLSCREEN' }), []);

    return {
        state,
        dispatch,
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
    };
}

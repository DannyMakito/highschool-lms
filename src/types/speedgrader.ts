/**
 * SpeedGrader Type Definitions
 * Canvas-style decoupled overlay annotation architecture
 */

// ── Annotation Types ──

export type AnnotationType =
    | 'highlight'
    | 'drawing'
    | 'text_comment'
    | 'area_comment'
    | 'strikethrough';

/** A single annotation stored in submission_annotations */
export interface AnnotationData {
    id: string;
    submission_id: string;
    author_id: string;
    annotation_type: AnnotationType;

    // Spatial – percentage-based coordinates relative to page dimensions (0–100)
    page_number: number;
    x_percent?: number;
    y_percent?: number;
    width_percent?: number;
    height_percent?: number;

    // Text range (for text submissions – character offsets)
    text_range_start?: number;
    text_range_end?: number;
    selected_text?: string;

    // Drawing data (fabric.js serialised path)
    drawing_data?: Record<string, unknown>;

    // Content
    comment_text?: string;

    // Visual
    color: string;
    opacity: number;

    // Rubric linking
    rubric_criterion_id?: string;

    // State
    is_resolved: boolean;
    created_at: string;
    updated_at: string;

    // Joined fields from Supabase select
    profiles?: { full_name: string };
}

// ── Criterion Grade ──

export interface CriterionGrade {
    id: string;
    submission_id: string;
    criterion_id: string;
    score: number;
    feedback?: string;
    graded_by?: string;
    graded_at?: string;
}

// ── Submission File Metadata ──

export interface SubmissionFile {
    id: string;
    submission_id: string;
    storage_path: string;
    original_filename: string;
    mime_type: string;
    file_size_bytes?: number;
    page_count?: number;
    version: number;
    uploaded_at: string;
    uploaded_by: string;
}

// ── UI State ──

/** Currently selected tool in the annotation toolbar */
export type AnnotationTool =
    | 'select'
    | 'highlight'
    | 'draw'
    | 'comment'
    | 'strikethrough'
    | 'eraser';

/** Annotation colour presets */
export const ANNOTATION_COLORS = [
    { name: 'Yellow', hex: '#FFEB3B' },
    { name: 'Green', hex: '#4CAF50' },
    { name: 'Blue', hex: '#2196F3' },
    { name: 'Red', hex: '#F44336' },
    { name: 'Purple', hex: '#9C27B0' },
    { name: 'Orange', hex: '#FF9800' },
] as const;

/** Full state machine for the SpeedGrader UI */
export interface SpeedGraderState {
    // Navigation
    currentSubmissionId: string | null;
    currentPageNumber: number;
    totalPages: number;
    zoomLevel: number;

    // Tools
    activeTool: AnnotationTool;
    activeColor: string;

    // Data
    annotations: AnnotationData[];
    criterionGrades: CriterionGrade[];
    overallFeedback: string;

    // UI flags
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    isFullscreen: boolean;
}

/** Actions dispatched to the SpeedGrader reducer */
export type SpeedGraderAction =
    | { type: 'SET_SUBMISSION'; submissionId: string | null }
    | { type: 'SET_PAGE'; page: number }
    | { type: 'SET_TOTAL_PAGES'; total: number }
    | { type: 'SET_ZOOM'; zoom: number }
    | { type: 'SET_TOOL'; tool: AnnotationTool }
    | { type: 'SET_COLOR'; color: string }
    | { type: 'SET_ANNOTATIONS'; annotations: AnnotationData[] }
    | { type: 'ADD_ANNOTATION'; annotation: AnnotationData }
    | { type: 'UPDATE_ANNOTATION'; annotation: AnnotationData }
    | { type: 'DELETE_ANNOTATION'; annotationId: string }
    | { type: 'SET_CRITERION_GRADES'; grades: CriterionGrade[] }
    | { type: 'UPDATE_CRITERION_GRADE'; criterionId: string; score: number; feedback?: string }
    | { type: 'SET_FEEDBACK'; feedback: string }
    | { type: 'SET_SAVING'; saving: boolean }
    | { type: 'MARK_SAVED' }
    | { type: 'TOGGLE_FULLSCREEN' };

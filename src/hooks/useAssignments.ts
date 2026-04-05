
import { useAssignmentsContext } from '@/context/AssignmentsContext';

/**
 * Thin wrapper around AssignmentsContext.
 */
export function useAssignments() {
    const { 
        assignments, 
        rubrics, 
        submissions, 
        loading, 
        refreshAssignments, 
        addAssignmentSubmission,
        submitWork,
        addAssignment,
        deleteAssignment,
        addRubric,
        notifyNonSubmitters,
        getRubric,
        getAssignmentSubmissions,
        updateGrade
    } = useAssignmentsContext();
    
    return {
        assignments,
        rubrics,
        submissions,
        loading,
        refreshAssignments,
        addAssignmentSubmission,
        submitWork,
        addAssignment,
        deleteAssignment,
        addRubric,
        notifyNonSubmitters,
        getRubric,
        getAssignmentSubmissions,
        updateGrade
    };
}
 
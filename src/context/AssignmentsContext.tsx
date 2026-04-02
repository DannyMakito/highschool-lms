
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Assignment, Rubric, AssignmentSubmission } from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface AssignmentsContextType {
    assignments: Assignment[];
    rubrics: Rubric[];
    submissions: AssignmentSubmission[];
    loading: boolean;
    refreshAssignments: () => Promise<void>;
    addAssignmentSubmission: (submission: any) => Promise<void>;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [rubrics, setRubrics] = useState<Rubric[]>([]);
    const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAssignmentsData = async () => {
        let cancelled = false;
        setLoading(true);

        // Failsafe timer
        const timer = setTimeout(() => {
            if (!cancelled && loading) {
                console.warn("Assignments data fetch timed out, forcing loading to false");
                setLoading(false);
            }
        }, 5000);

        if (!user) {
            setAssignments([]);
            setRubrics([]);
            setSubmissions([]);
            setLoading(false);
            clearTimeout(timer);
            return;
        }

        try {
            // Fetch all assignment data in parallel for speed
            const [rubricsRes, assignmentsRes, submissionsRes] = await Promise.all([
                supabase.from('rubrics').select('*, criteria:rubric_criteria(*)'),
                supabase.from('assignments').select('*').order('created_at', { ascending: false }),
                supabase.from('assignment_submissions').select('*, annotations(*)'),
            ]);

            const { data: rubricsData, error: rubricsError } = rubricsRes;
            const { data: assignmentsData, error: assignmentsError } = assignmentsRes;
            const { data: submissionsData, error: submissionsError } = submissionsRes;

            if (rubricsError || assignmentsError || submissionsError) {
                console.error("Supabase Error:", rubricsError || assignmentsError || submissionsError);
            }

            setAssignments((assignmentsData || []).map(a => ({
                ...a,
                subjectId: a.subject_id,
                totalMarks: a.total_marks,
                submissionType: a.submission_type,
                isGroup: a.is_group,
                durationDays: a.duration_days,
                dueDate: a.due_date,
                rubricId: a.rubric_id
            })));

            setRubrics((rubricsData || []).map(r => ({
                ...r,
                criteria: r.criteria || []
            })));

            setSubmissions((submissionsData || []).map(s => ({
                ...s,
                assignmentId: s.assignment_id,
                studentId: s.student_id,
                fileType: s.file_type,
                submittedAt: s.submitted_at,
                rubricGrades: s.rubric_grades,
                overallFeedback: s.overall_feedback,
                totalGrade: s.total_grade,
                isReleased: s.is_released,
                annotations: (s.annotations || []).map((an: any) => ({
                    ...an,
                    authorName: an.author_id,
                    createdAt: an.created_at
                }))
            })));

        } catch (error) {
            console.error("Error fetching assignment data:", error);
        } finally {
            clearTimeout(timer);
            if (!cancelled) setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchAssignmentsData();
        }
    }, [user?.id, authLoading]);

    const addAssignmentSubmission = async (submission: any) => {
        // Implementation for adding submission to Supabase and updating local state
        // For now, let's just refresh to stay in sync
        await fetchAssignmentsData();
    };

    const value = {
        assignments,
        rubrics,
        submissions,
        loading,
        refreshAssignments: fetchAssignmentsData,
        addAssignmentSubmission
    };

    return <AssignmentsContext.Provider value={value}>{children}</AssignmentsContext.Provider>;
}

export function useAssignmentsContext() {
    const context = useContext(AssignmentsContext);
    if (context === undefined) {
        throw new Error("useAssignmentsContext must be used within an AssignmentsProvider");
    }
    return context;
}

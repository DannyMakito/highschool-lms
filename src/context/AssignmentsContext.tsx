
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
    addAssignment: (assignment: Partial<Assignment>) => Promise<Assignment>;
    deleteAssignment: (id: string) => Promise<void>;
    addRubric: (rubric: Partial<Rubric>) => Promise<Rubric>;
    notifyNonSubmitters: (assignmentId: string) => Promise<void>;
    getRubric: (id: string | undefined) => Rubric | undefined;
    getAssignmentSubmissions: (assignmentId: string) => AssignmentSubmission[];
    updateGrade: (submissionId: string, gradeData: Partial<AssignmentSubmission>) => Promise<void>;
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

        if (!user) {
            setAssignments([]);
            setRubrics([]);
            setSubmissions([]);
            setLoading(false);
            return;
        }

        try {
            let assignmentsQuery = supabase.from('assignments').select('*').order('created_at', { ascending: false });
            let submissionsQuery = supabase.from('assignment_submissions').select('*, annotations(*)');

            // Filter by role
            if (user.role === 'teacher') {
                // Teachers: fetch all assignments and submissions
                // Client-side filtering will be applied after data load
            } else if (user.role === 'learner') {
                // Students only see published assignments
                assignmentsQuery = assignmentsQuery.eq('status', 'published');
                // Students only see their own submissions
                submissionsQuery = submissionsQuery.eq('student_id', user.id);
            }
            
            // Fetch all assignment data in parallel for speed
            const [rubricsRes, assignmentsRes, submissionsRes] = await Promise.all([
                supabase.from('rubrics').select('*, criteria:rubric_criteria(*)'),
                assignmentsQuery,
                submissionsQuery
            ]);

            const { data: rubricsData, error: rubricsError } = rubricsRes;
            const { data: assignmentsData, error: assignmentsError } = assignmentsRes;
            const { data: submissionsData, error: submissionsError } = submissionsRes;

            if (rubricsError || assignmentsError || submissionsError) {
                console.error("[AssignmentsContext] Supabase Errors:", {
                    rubricsError: rubricsError?.message,
                    assignmentsError: assignmentsError?.message,
                    submissionsError: submissionsError?.message,
                    submissionsErrorCode: submissionsError?.code,
                    submissionsErrorDetails: submissionsError?.details
                });
            }

            console.log("[AssignmentsContext] Data fetched:", {
                userRole: user.role,
                assignmentsCount: (assignmentsData || []).length,
                submissionsCount: (submissionsData || []).length,
                submissions: (submissionsData || []).map(s => ({ 
                    id: s.id, 
                    assignment_id: s.assignment_id, 
                    student_id: s.student_id,
                    status: s.status
                })),
                assignments: (assignmentsData || []).map(a => ({ 
                    id: a.id, 
                    title: a.title, 
                    subject_id: a.subject_id 
                }))
            });

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

            // For teachers, filter submissions to only those for their assignments
            // Note: Once created_by column is added to assignments table, we can filter server-side
            let filteredSubmissions = submissionsData || [];
            if (user.role === 'teacher' && assignmentsData) {
                // Teachers can see submissions for any assignment (temporary until RLS is properly set up)
                // In production, this should be filtered by RLS policies
                console.log("[AssignmentsContext] Teacher viewing all submissions for their classes");
            }

            setSubmissions(filteredSubmissions.map(s => ({
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
            if (!cancelled) setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchAssignmentsData();
        }
    }, [user?.id, authLoading]);

    const addAssignmentSubmission = async (submission: any) => {
        // Convert camelCase to snake_case for database
        const dbSubmission = {
            assignment_id: submission.assignmentId,
            student_id: submission.studentId,
            student_name: submission.studentName || 'Unknown Student',
            content: submission.content,
            file_type: submission.fileType,
            status: submission.status || 'submitted',
            submitted_at: submission.submittedAt || new Date().toISOString(),
            rubric_grades: submission.rubricGrades || {},
            overall_feedback: submission.overallFeedback || '',
            total_grade: submission.totalGrade || 0,
            is_released: submission.isReleased || false
        };
        const { error } = await supabase.from('assignment_submissions').insert([dbSubmission]);
        if (error) throw error;
        await fetchAssignmentsData();
    };

    const updateGrade = async (submissionId: string, gradeData: Partial<AssignmentSubmission>) => {
        // Convert camelCase to snake_case for database
        const dbUpdate: any = {};
        if (gradeData.rubricGrades) dbUpdate.rubric_grades = gradeData.rubricGrades;
        if (gradeData.overallFeedback !== undefined) dbUpdate.overall_feedback = gradeData.overallFeedback;
        if (gradeData.totalGrade !== undefined) dbUpdate.total_grade = gradeData.totalGrade;
        if (gradeData.status) dbUpdate.status = gradeData.status;
        if (gradeData.isReleased !== undefined) dbUpdate.is_released = gradeData.isReleased;
        // Handle annotations if provided (store as JSON in database)
        if (gradeData.annotations !== undefined) dbUpdate.annotations = gradeData.annotations;
        
        console.log('[AssignmentsContext] Updating grade:', { submissionId, updateData: dbUpdate, status: gradeData.status });
        
        const { error } = await supabase
            .from('assignment_submissions')
            .update(dbUpdate)
            .eq('id', submissionId);
        
        if (error) {
            console.error('[AssignmentsContext] Error updating grade:', error);
            throw error;
        }
        console.log('[AssignmentsContext] Grade updated successfully');
        await fetchAssignmentsData();
    };

    const addAssignment = async (assignment: Partial<Assignment>) => {
        let rubricId = assignment.rubricId;
        
        // If no rubric selected or it's the default placeholder, create a default rubric
        if (!rubricId || rubricId === "default-essay-rubric") {
            try {
                console.log('[AssignmentsContext] Creating default rubric for assignment:', assignment.title);
                const newRubric = await addRubric({
                    title: `${assignment.title} - Rubric`,
                    criteria: [
                        { title: 'Content Quality', description: 'Does the submission address the assignment requirements with depth and accuracy?', maxPoints: 25 },
                        { title: 'Organization', description: 'Is the work well-structured, clear, and easy to follow?', maxPoints: 25 },
                        { title: 'Grammar & Clarity', description: 'Is the writing clear, grammatically correct, and professional?', maxPoints: 25 },
                        { title: 'Critical Thinking', description: 'Does the work demonstrate analysis, reasoning, and original thought?', maxPoints: 25 }
                    ]
                });
                rubricId = newRubric.id;
                console.log('[AssignmentsContext] Default rubric created:', rubricId);
            } catch (rubricErr) {
                console.warn('[AssignmentsContext] Failed to create default rubric:', rubricErr);
                rubricId = null; // Proceed without rubric if creation fails
            }
        }
        
        const { data, error } = await supabase
            .from('assignments')
            .insert([{
                title: assignment.title,
                description: assignment.description,
                subject_id: assignment.subjectId,
                total_marks: assignment.totalMarks,
                submission_type: assignment.submissionType,
                is_group: assignment.isGroup,
                due_date: assignment.dueDate,
                rubric_id: rubricId || null,
                status: assignment.status || 'published',
                duration_days: assignment.durationDays || 7
            }])
            .select()
            .single();

        if (error) throw error;
        const mapped = {
            ...data,
            subjectId: data.subject_id,
            totalMarks: data.total_marks,
            submissionType: data.submission_type,
            isGroup: data.is_group,
            durationDays: data.duration_days,
            dueDate: data.due_date,
            rubricId: data.rubric_id
        };
        setAssignments(prev => [mapped, ...prev]);
        return mapped;
    };

    const deleteAssignment = async (id: string) => {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (error) throw error;
        setAssignments(prev => prev.filter(a => a.id !== id));
    };

    const addRubric = async (rubric: Partial<Rubric>) => {
        const { data: newRubric, error: rubricError } = await supabase
            .from('rubrics')
            .insert([{ title: rubric.title }])
            .select()
            .single();

        if (rubricError) throw rubricError;

        if (rubric.criteria && rubric.criteria.length > 0) {
            const criteriaToInsert = rubric.criteria.map(c => ({
                rubric_id: newRubric.id,
                title: c.title,
                description: c.description,
                max_points: c.maxPoints
            }));

            const { error: criteriaError } = await supabase.from('rubric_criteria').insert(criteriaToInsert);
            if (criteriaError) throw criteriaError;
        }

        const finalRubric = { ...newRubric, criteria: rubric.criteria || [] };
        setRubrics(prev => [...prev, finalRubric]);
        return finalRubric;
    };

    const notifyNonSubmitters = async (assignmentId: string) => {
        // Implementation for notifications
        console.log("Notifying students who haven't submitted for assignment:", assignmentId);
    };

    const getRubric = (id: string | undefined) => {
        if (!id) return undefined;
        return rubrics.find(r => r.id === id);
    };

    const getAssignmentSubmissions = (assignmentId: string) => {
        const result = submissions.filter(s => s.assignmentId === assignmentId);
        console.log("[AssignmentsContext] getAssignmentSubmissions called:", {
            assignmentId,
            totalSubmissions: submissions.length,
            filteredSubmissions: result.length,
            submissionsByAssignment: submissions.map(s => ({ id: s.id, assignmentId: s.assignmentId })),
            matchedSubmissions: result.map(s => ({ id: s.id, assignmentId: s.assignmentId }))
        });
        return result;
    };

    const value = {
        assignments,
        rubrics,
        submissions,
        loading,
        refreshAssignments: fetchAssignmentsData,
        addAssignmentSubmission,
        submitWork: addAssignmentSubmission,
        addAssignment,
        deleteAssignment,
        addRubric,
        notifyNonSubmitters,
        getRubric,
        getAssignmentSubmissions,
        updateGrade
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
 
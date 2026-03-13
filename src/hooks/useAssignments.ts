
import { useState, useEffect, useCallback } from 'react';
import type { Assignment, Rubric, AssignmentSubmission, Annotation } from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface AssignmentData {
    assignments: Assignment[];
    rubrics: Rubric[];
    submissions: AssignmentSubmission[];
}

export function useAssignments() {
    const { user } = useAuth();
    const [data, setData] = useState<AssignmentData>({
        assignments: [],
        rubrics: [],
        submissions: []
    });
    const [loading, setLoading] = useState(true);

    // Initial Fetch
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchAssignmentsData = async () => {
            setLoading(true);
            try {
                // Fetch rubrics with criteria
                const { data: rubricsData, error: rubricsError } = await supabase
                    .from('rubrics')
                    .select('*, criteria:rubric_criteria(*)');

                const { data: assignmentsData, error: assignmentsError } = await supabase
                    .from('assignments')
                    .select('*')
                    .order('created_at', { ascending: false });

                const { data: submissionsData, error: submissionsError } = await supabase
                    .from('assignment_submissions')
                    .select('*, annotations(*)');

                if (rubricsError || assignmentsError || submissionsError) {
                    console.error("Supabase Error:", rubricsError || assignmentsError || submissionsError);
                }

                setData({
                    assignments: (assignmentsData || []).map(a => ({
                        ...a,
                        subjectId: a.subject_id,
                        totalMarks: a.total_marks,
                        submissionType: a.submission_type,
                        isGroup: a.is_group,
                        durationDays: a.duration_days,
                        dueDate: a.due_date,
                        rubricId: a.rubric_id
                    })),
                    rubrics: (rubricsData || []).map(r => ({
                        ...r,
                        criteria: r.criteria || []
                    })),
                    submissions: (submissionsData || []).map(s => ({
                        ...s,
                        assignmentId: s.assignment_id,
                        studentId: s.student_id,
                        fileType: s.file_type,
                        submittedAt: s.submitted_at,
                        rubricGrades: s.rubric_grades,
                        overallFeedback: s.overall_feedback,
                        totalGrade: s.total_grade,
                        isReleased: s.is_released,
                        annotations: (s.annotations || []).map(an => ({
                            ...an,
                            authorName: an.author_id, // Map ID to name if necessary, or fetch profile
                            createdAt: an.created_at
                        }))
                    }))
                });
            } catch (error) {
                console.error("Error fetching assignment data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignmentsData();
    }, [user?.id]);

    const addAssignment = async (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
        const { data: newAssignment, error } = await supabase
            .from('assignments')
            .insert({
                subject_id: assignment.subjectId,
                title: assignment.title,
                description: assignment.description,
                total_marks: assignment.totalMarks,
                submission_type: assignment.submissionType,
                is_group: assignment.isGroup,
                duration_days: assignment.durationDays,
                due_date: assignment.dueDate,
                rubric_id: assignment.rubricId,
                status: assignment.status
            })
            .select()
            .single();

        if (error) throw error;

        const mappedAssignment = {
            ...newAssignment,
            subjectId: newAssignment.subject_id,
            totalMarks: newAssignment.total_marks,
            submissionType: newAssignment.submission_type,
            isGroup: newAssignment.is_group,
            durationDays: newAssignment.duration_days,
            dueDate: newAssignment.due_date,
            rubricId: newAssignment.rubric_id
        };

        setData(prev => ({
            ...prev,
            assignments: [mappedAssignment, ...prev.assignments]
        }));
        return mappedAssignment;
    };

    const updateAssignment = async (id: string, updates: Partial<Assignment>) => {
        const dbUpdates: any = {};
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.totalMarks) dbUpdates.total_marks = updates.totalMarks;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.dueDate) dbUpdates.due_date = updates.dueDate;

        const { error } = await supabase
            .from('assignments')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        setData(prev => ({
            ...prev,
            assignments: prev.assignments.map(a => a.id === id ? { ...a, ...updates } : a)
        }));
    };

    const deleteAssignment = async (id: string) => {
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        setData(prev => ({
            ...prev,
            assignments: prev.assignments.filter(a => a.id !== id),
            submissions: prev.submissions.filter(s => s.assignmentId !== id)
        }));
    };

    const addRubric = async (rubric: Omit<Rubric, 'id'>) => {
        const { data: newRubric, error: rubricError } = await supabase
            .from('rubrics')
            .insert({ title: rubric.title })
            .select()
            .single();

        if (rubricError) throw rubricError;

        const criteriaToInsert = rubric.criteria.map(c => ({
            rubric_id: newRubric.id,
            title: c.title,
            description: c.description,
            max_points: c.maxPoints
        }));

        const { data: criteriaData, error: criteriaError } = await supabase
            .from('rubric_criteria')
            .insert(criteriaToInsert)
            .select();

        if (criteriaError) throw criteriaError;

        const completeRubric = {
            ...newRubric,
            criteria: criteriaData.map(c => ({
                id: c.id,
                title: c.title,
                description: c.description,
                maxPoints: c.max_points
            }))
        };

        setData(prev => ({
            ...prev,
            rubrics: [...prev.rubrics, completeRubric]
        }));
        return completeRubric;
    };

    const submitWork = async (submission: Omit<AssignmentSubmission, 'id' | 'submittedAt' | 'status' | 'annotations' | 'rubricGrades' | 'overallFeedback' | 'totalGrade' | 'isReleased'>) => {
        const { data: newSubmission, error } = await supabase
            .from('assignment_submissions')
            .insert({
                assignment_id: submission.assignmentId,
                student_id: submission.studentId,
                content: submission.content,
                file_type: submission.fileType,
                status: 'submitted'
            })
            .select()
            .single();

        if (error) throw error;

        const mappedSubmission = {
            ...newSubmission,
            assignmentId: newSubmission.assignment_id,
            studentId: newSubmission.student_id,
            fileType: newSubmission.file_type,
            submittedAt: newSubmission.submitted_at,
            status: newSubmission.status,
            annotations: [],
            rubricGrades: {},
            overallFeedback: "",
            totalGrade: 0,
            isReleased: false
        };

        setData(prev => ({
            ...prev,
            submissions: [mappedSubmission, ...prev.submissions]
        }));
        return mappedSubmission;
    };

    const updateGrade = async (submissionId: string, updates: Partial<Pick<AssignmentSubmission, 'annotations' | 'rubricGrades' | 'overallFeedback' | 'totalGrade' | 'status' | 'isReleased'>>) => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.overallFeedback) dbUpdates.overall_feedback = updates.overallFeedback;
        if (updates.totalGrade !== undefined) dbUpdates.total_grade = updates.totalGrade;
        if (updates.isReleased !== undefined) dbUpdates.is_released = updates.isReleased;
        if (updates.rubricGrades) dbUpdates.rubric_grades = updates.rubricGrades;

        const { error } = await supabase
            .from('assignment_submissions')
            .update(dbUpdates)
            .eq('id', submissionId);

        if (error) throw error;

        // Note: Annotations are in a separate table, should be handled if present in updates
        if (updates.annotations && updates.annotations.length > 0) {
            // Logic to sync annotations would go here if needed
        }

        setData(prev => ({
            ...prev,
            submissions: prev.submissions.map(s => s.id === submissionId ? { ...s, ...updates } : s)
        }));
    };

    const getSubjectAssignments = useCallback((subjectId: string) => {
        return data.assignments.filter(a => a.subjectId === subjectId);
    }, [data.assignments]);

    const getAssignmentSubmissions = useCallback((assignmentId: string) => {
        return data.submissions.filter(s => s.assignmentId === assignmentId);
    }, [data.submissions]);

    const getStudentSubmissions = useCallback((studentId: string) => {
        return data.submissions.filter(s => s.studentId === studentId);
    }, [data.submissions]);

    const getRubric = useCallback((id?: string) => {
        if (!id) return null;
        return data.rubrics.find(r => r.id === id) || null;
    }, [data.rubrics]);

    const notifyNonSubmitters = (assignmentId: string) => {
        return true;
    };

    return {
        assignments: data.assignments,
        rubrics: data.rubrics,
        submissions: data.submissions,
        loading,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        addRubric,
        submitWork,
        updateGrade,
        getSubjectAssignments,
        getAssignmentSubmissions,
        getStudentSubmissions,
        getRubric,
        notifyNonSubmitters,
    };
}

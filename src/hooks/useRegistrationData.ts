
import { useState, useEffect, useCallback } from 'react';
import type {
    Grade, RegisterClass, SubjectClass,
    Student, StudentAssignedSubject, StudentSubject, StudentSubjectClass
} from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSubjects } from './useSubjects';

type StudentsWithSubjectsRow = Student & {
    full_name?: string;
    email?: string;
    pin?: string;
    created_at?: string;
    subjects?: StudentAssignedSubject[];
    student_subjects?: Array<{ id: string; student_id: string; subject_id: string }>;
};

const normalizeAssignedSubject = (
    item: Partial<StudentAssignedSubject> & {
        id?: string;
        subject_id?: string;
        subjectId?: string;
        subject_name?: string;
        grade_tier?: string;
        subjects?: { name?: string | null } | null;
    }
): StudentAssignedSubject => ({
    id: item.id,
    subjectId: item.subjectId ?? item.subject_id ?? '',
    subject_id: item.subject_id ?? item.subjectId ?? '',
    subject_name: item.subject_name ?? item.subjects?.name ?? '',
    grade_tier: item.grade_tier ?? '',
});

export function useRegistrationData() {
    const { user, loading: authLoading } = useAuth();
    const { subjects } = useSubjects();
    const [grades, setGrades] = useState<Grade[]>([]);
    const [registerClasses, setRegisterClasses] = useState<RegisterClass[]>([]);
    const [subjectClasses, setSubjectClasses] = useState<SubjectClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
    const [studentSubjectClasses, setStudentSubjectClasses] = useState<StudentSubjectClass[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setGrades([]);
            setRegisterClasses([]);
            setSubjectClasses([]);
            setStudents([]);
            setStudentSubjects([]);
            setStudentSubjectClasses([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchRegistrationData = async () => {
            setLoading(true);
            try {

                const gradesRes = await supabase.from('grades').select('*');
                const rcRes = await supabase.from('register_classes').select('*');
                const scRes = await supabase.from('subject_classes').select('*');
                // Use the new view or RPC to get students together with their assigned subjects.
                // This reduces client-side joins & ensures we rely on the DB to enforce RLS.
                const { data: studentsRpc, error: studentsRpcErr } = await supabase.rpc<StudentsWithSubjectsRow[]>('get_students_with_subjects');
                const studentsViewRes = await supabase.from<StudentsWithSubjectsRow>('students_with_subjects').select('*');

                // Fallback path: fetch directly from students + profile relations (for environments where RPC/View may be missing or incomplete)
                // Avoid relying on implicit FK relationship to student_subjects from students, as some schemas may not have it configured.
                const studentsDirectRes = await supabase.from('students').select(`
                    *,
                    profiles(*)
                `);

                const ssRes = await supabase.from('student_subjects').select(`
                    *,
                    subjects(name)
                `);
                const sscRes = await supabase.from('student_subject_classes').select('*');

                if (gradesRes.error) console.error("Grades Error:", gradesRes.error);
                if (rcRes.error) console.error("RC Error:", rcRes.error);
                if (scRes.error) console.error("SC Error:", scRes.error);
                if (studentsRpcErr) console.warn("Students RPC error (falling back to view):", studentsRpcErr);
                if (studentsViewRes.error) console.error("Students View Error:", studentsViewRes.error);

                const gradesData = gradesRes.data;
                const rcData = rcRes.data;
                const scData = scRes.data;

                const studentsRpcData = Array.isArray(studentsRpc) ? studentsRpc : [];
                const studentsViewData = Array.isArray(studentsViewRes.data) ? studentsViewRes.data : [];
                const studentsDirectData = Array.isArray(studentsDirectRes.data) ? studentsDirectRes.data : [];

                // Prioritize direct joined student data to avoid view/RPC mismatch in deployed env.
                // Fall back to RPC/view only when direct results are unavailable.
                const studentsData = studentsDirectData.length > 0 ? studentsDirectData :
                    (studentsRpcData.length > 0 ? studentsRpcData : studentsViewData);

                const ssData = ssRes.data;
                const sscData = sscRes.data;

                // Normalize grades: ensure `level` exists (from level, sort_order, or derived from name)
                setGrades((gradesData || []).map((g: { level?: number; sort_order?: number; name?: string }) => ({
                    ...g,
                    level: g.level ?? g.sort_order ?? (parseInt(String(g.name || '').replace(/\D/g, ''), 10) || 0),
                })));
                setRegisterClasses((rcData || []).map(rc => ({
                    ...rc,
                    gradeId: rc.grade_id,
                    classTeacherId: rc.class_teacher_id,
                    maxStudents: rc.max_students,
                    createdAt: rc.created_at
                })));
                setSubjectClasses((scData || []).map(sc => ({
                    ...sc,
                    subjectId: sc.subject_id,
                    teacherId: sc.teacher_id,
                    gradeId: sc.grade_id,
                    createdAt: sc.created_at
                })));
                const studentSubjectsByStudentId = (ssData || []).reduce<Record<string, StudentAssignedSubject[]>>((acc, item) => {
                    if (!item.student_id) return acc;
                    if (!acc[item.student_id]) acc[item.student_id] = [];
                    acc[item.student_id].push(normalizeAssignedSubject(item));
                    return acc;
                }, {});

                setStudents((studentsData || []).map(s => ({
                    ...s,
                    firstName: (s.profiles?.full_name || s.full_name || "").split(' ')[0] || '',
                    lastName: (s.profiles?.full_name || s.full_name || "").split(' ').slice(1).join(' ') || '',
                    name: s.profiles?.full_name || s.full_name || '',
                    email: s.profiles?.email || s.email || '',
                    pin: s.profiles?.pin || s.pin || '',
                    administrationNumber: s.administration_number,
                    admissionYear: s.admission_year,
                    gradeId: s.grade_id,
                    registerClassId: s.register_class_id,
                    grade: gradesData?.find(g => g.id === s.grade_id)?.name || '',
                    studentClass: rcData?.find(rc => rc.id === s.register_class_id)?.name || '',
                    status: s.status || 'inactive',
                    createdAt: s.profiles?.created_at || s.created_at,
                    subjects: (s.subjects && s.subjects.length > 0)
                        ? s.subjects.map(normalizeAssignedSubject)
                        : (studentSubjectsByStudentId[s.id] || [])
                })));
                setStudentSubjects((ssData || []).map(ss => ({
                    ...ss,
                    studentId: ss.student_id,
                    subjectId: ss.subject_id
                })));
                setStudentSubjectClasses((sscData || []).map(ssc => ({
                    ...ssc,
                    studentId: ssc.student_id,
                    subjectClassId: ssc.subject_class_id
                })));
            } catch (error) {
                console.error("Error fetching registration data:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchRegistrationData();

        return () => { cancelled = true; };
    }, [user, authLoading]);

    // === Grade CRUD ===
    const addGrade = async (grade: Omit<Grade, 'id'>) => {
        const { data: newGrade, error } = await supabase
            .from('grades')
            .insert({ name: grade.name, level: grade.level })
            .select()
            .single();

        if (error) throw error;
        setGrades(prev => [...prev, newGrade]);
        return newGrade;
    };

    // === Register Class CRUD ===
    const addRegisterClass = async (rc: Omit<RegisterClass, 'id' | 'createdAt'>) => {
        const { data: newRC, error } = await supabase
            .from('register_classes')
            .insert({
                name: rc.name,
                grade_id: rc.gradeId,
                class_teacher_id: rc.classTeacherId,
                max_students: rc.maxStudents
            })
            .select()
            .single();

        if (error) throw error;
        const mappedRC = { ...newRC, gradeId: newRC.grade_id, classTeacherId: newRC.class_teacher_id, maxStudents: newRC.max_students, createdAt: newRC.created_at };
        setRegisterClasses(prev => [...prev, mappedRC]);
        return mappedRC;
    };

    const updateRegisterClass = async (id: string, updates: Partial<RegisterClass>) => {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates['name'] = updates.name;
        if (updates.gradeId !== undefined) dbUpdates['grade_id'] = updates.gradeId;
        if (updates.classTeacherId !== undefined) dbUpdates['class_teacher_id'] = updates.classTeacherId || null;
        if (updates.maxStudents !== undefined) dbUpdates['max_students'] = updates.maxStudents;

        const { error } = await supabase
            .from('register_classes')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
        setRegisterClasses(prev => prev.map(rc => rc.id === id ? { ...rc, ...updates } : rc));
    };

    const deleteRegisterClass = async (id: string) => {
        const { error } = await supabase
            .from('register_classes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setRegisterClasses(prev => prev.filter(rc => rc.id !== id));
    };

    // === Subject Class CRUD ===
    const addSubjectClass = async (sc: Omit<SubjectClass, 'id' | 'createdAt'>) => {
        const { data: newSC, error } = await supabase
            .from('subject_classes')
            .insert({
                subject_id: sc.subjectId,
                name: sc.name,
                teacher_id: sc.teacherId,
                capacity: sc.capacity,
                grade_id: sc.gradeId
            })
            .select()
            .single();

        if (error) throw error;
        const mappedSC = { ...newSC, subjectId: newSC.subject_id, teacherId: newSC.teacher_id, gradeId: newSC.grade_id, createdAt: newSC.created_at };
        setSubjectClasses(prev => [...prev, mappedSC]);
        return mappedSC;
    };

    const updateSubjectClass = async (id: string, updates: Partial<SubjectClass>) => {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.name !== undefined) dbUpdates['name'] = updates.name;
        if (updates.subjectId !== undefined) dbUpdates['subject_id'] = updates.subjectId;
        if (updates.gradeId !== undefined) dbUpdates['grade_id'] = updates.gradeId;
        if (updates.teacherId !== undefined) dbUpdates['teacher_id'] = updates.teacherId || null;
        if (updates.capacity !== undefined) dbUpdates['capacity'] = updates.capacity;

        const { error } = await supabase
            .from('subject_classes')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
        setSubjectClasses(prev => prev.map(sc => sc.id === id ? { ...sc, ...updates } : sc));
    };

    const deleteSubjectClass = async (id: string) => {
        const { error } = await supabase
            .from('subject_classes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setSubjectClasses(prev => prev.filter(sc => sc.id !== id));
        setStudentSubjectClasses(prev => prev.filter(ssc => ssc.subjectClassId !== id));
    };

    // === Student CRUD ===
    const addStudent = async (student: Omit<Student, 'id' | 'createdAt' | 'name' | 'pin'>, options?: { subjectIds?: string[] }) => {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("create-user", {
            body: {
                role: 'student',
                name: `${student.firstName} ${student.lastName}`,
                email: student.email,
                pin: Math.floor(100000 + Math.random() * 900000).toString(),
                administrationNumber: student.administrationNumber,
                admissionYear: student.admissionYear,
                gender: student.gender,
                gradeId: student.gradeId,
                registerClassId: student.registerClassId,
                status: student.status || 'active',
                subjectIds: options?.subjectIds ?? [],
            },
            headers: {
                Authorization: `Bearer ${session?.access_token}`
            }
        });

        if (error) throw error;

        const created = data as { id: string; created_at?: string; pin: string };

        const subjectIds = options?.subjectIds ?? [];
        const mappedStudent: Student = {
            ...student,
            id: created.id,
            name: `${student.firstName} ${student.lastName}`,
            pin: created.pin,
            grade: grades.find(g => g.id === student.gradeId)?.name || '',
            studentClass: registerClasses.find(rc => rc.id === student.registerClassId)?.name || '',
            createdAt: created.created_at || new Date().toISOString(),
            subjects: subjectIds.map(subjectId => {
                const subject = subjects.find(s => s.id === subjectId);
                return normalizeAssignedSubject({
                    id: `temp-${created.id}-${subjectId}`,
                    subject_id: subjectId,
                    subject_name: subject?.name || '',
                    grade_tier: subject?.gradeTier || ''
                });
            }),
        };

        setStudents(prev => [...prev, mappedStudent]);
        if (subjectIds.length > 0) {
            setStudentSubjects(prev => [...prev, ...subjectIds.map(subjectId => ({
                id: `temp-${created.id}-${subjectId}`,
                studentId: created.id,
                subjectId,
            }))]);
        }
        return mappedStudent;
    };

    const updateStudent = async (id: string, updates: Partial<Student>) => {
        const dbUpdates: Record<string, unknown> = {};
        const profileUpdates: Record<string, unknown> = {};
        if (updates.administrationNumber !== undefined) dbUpdates['administration_number'] = updates.administrationNumber;
        if (updates.gender !== undefined) dbUpdates['gender'] = updates.gender;
        if (updates.admissionYear !== undefined) dbUpdates['admission_year'] = updates.admissionYear;
        if (updates.gradeId !== undefined) dbUpdates['grade_id'] = updates.gradeId;
        if (updates.registerClassId !== undefined) dbUpdates['register_class_id'] = updates.registerClassId;
        if (updates.status !== undefined) dbUpdates['status'] = updates.status;
        if (updates.firstName !== undefined || updates.lastName !== undefined) {
            const currentStudent = students.find(s => s.id === id);
            const firstName = updates.firstName ?? currentStudent?.firstName ?? '';
            const lastName = updates.lastName ?? currentStudent?.lastName ?? '';
            profileUpdates['full_name'] = `${firstName} ${lastName}`.trim();
        }
        if (updates.email !== undefined) profileUpdates['email'] = updates.email;
        if (updates.pin !== undefined) profileUpdates['pin'] = updates.pin;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase
                .from('students')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
        }

        if (Object.keys(profileUpdates).length > 0) {
            const { error } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', id);

            if (error) throw error;
        }

        setStudents(prev => prev.map(s => {
            if (s.id !== id) return s;
            const updated = { ...s, ...updates };
            if (updates.firstName || updates.lastName) {
                updated.name = `${updated.firstName} ${updated.lastName}`;
            }
            if (updates.gradeId) updated.grade = grades.find(g => g.id === updates.gradeId)?.name || '';
            if (updates.registerClassId) updated.studentClass = registerClasses.find(rc => rc.id === updates.registerClassId)?.name || '';
            return updated;
        }));
    };

    const deleteStudent = async (id: string) => {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setStudents(prev => prev.filter(s => s.id !== id));
        setStudentSubjects(prev => prev.filter(ss => ss.studentId !== id));
        setStudentSubjectClasses(prev => prev.filter(ssc => ssc.studentId !== id));
    };

    // === Student Subjects ===
    const assignSubjectsToStudent = async (studentId: string, subjectIds: string[]) => {
        const invalidPlacements = studentSubjectClasses.filter(ssc => {
            if (ssc.studentId !== studentId) return false;
            const subjectClass = subjectClasses.find(sc => sc.id === ssc.subjectClassId);
            return !!subjectClass && !subjectIds.includes(subjectClass.subjectId);
        });

        // Delete all old assignments for this student in DB
        const { error: delError } = await supabase
            .from('student_subjects')
            .delete()
            .eq('student_id', studentId);

        if (delError) throw delError;

        // Insert new assignments
        const newAssignments = subjectIds.map(subjectId => ({
            student_id: studentId,
            subject_id: subjectId
        }));

        const { data: insertedData, error: insError } = await supabase
            .from('student_subjects')
            .insert(newAssignments)
            .select();

        if (insError) throw insError;

        setStudentSubjects(prev => {
            const filtered = prev.filter(ss => ss.studentId !== studentId);
            const mapped = (insertedData || []).map(ss => ({ ...ss, studentId: ss.student_id, subjectId: ss.subject_id }));
            return [...filtered, ...mapped];
        });

        if (invalidPlacements.length > 0) {
            const { error: placementDeleteError } = await supabase
                .from('student_subject_classes')
                .delete()
                .in('id', invalidPlacements.map(placement => placement.id));

            if (placementDeleteError) throw placementDeleteError;

            setStudentSubjectClasses(prev =>
                prev.filter(ssc => !invalidPlacements.some(placement => placement.id === ssc.id))
            );
        }

        const assignedSubjects = subjectIds.map(subjectId => {
            const subject = subjects.find(s => s.id === subjectId);
            return normalizeAssignedSubject({
                id: `temp-${studentId}-${subjectId}`,
                subject_id: subjectId,
                subject_name: subject?.name || '',
                grade_tier: subject?.gradeTier || ''
            });
        });

        setStudents(prev => prev.map(student =>
            student.id === studentId ? { ...student, subjects: assignedSubjects } : student
        ));
    };

    const getStudentSubjects = (studentId: string) => {
        return studentSubjects.filter(ss => ss.studentId === studentId);
    };

    // === Auto-placement Logic ===
    const getSubjectClassEnrollment = useCallback((subjectClassId: string) => {
        return studentSubjectClasses.filter(ssc => ssc.subjectClassId === subjectClassId).length;
    }, [studentSubjectClasses]);

    const autoAssignSubjectClasses = useCallback(async (studentId: string, subjectIds: string[], gradeId: string) => {
            const newPlacements: Array<{ student_id: string; subject_class_id: string }> = [];
        for (const subjectId of subjectIds) {
            const matchingClasses = subjectClasses
                .filter(sc => sc.subjectId === subjectId && sc.gradeId === gradeId);

            if (matchingClasses.length === 0) continue;

            const sorted = matchingClasses
                .map(sc => ({
                    ...sc,
                    enrolled: studentSubjectClasses.filter(ssc => ssc.subjectClassId === sc.id).length + newPlacements.filter(p => p.subject_class_id === sc.id).length,
                }))
                .filter(sc => sc.enrolled < sc.capacity)
                .sort((a, b) => (b.capacity - b.enrolled) - (a.capacity - a.enrolled));

            if (sorted.length > 0) {
                newPlacements.push({
                    student_id: studentId,
                    subject_class_id: sorted[0].id,
                });
            }
        }

        // Cleanup old placements for these subjects
        // In Supabase, we might want to be careful about not deleting placements for subjects not in our list
        // but the original logic was to replace all subject class placements for the student if we re-run auto-assign.

        const { error: delError } = await supabase
            .from('student_subject_classes')
            .delete()
            .eq('student_id', studentId);

        if (delError) throw delError;

        if (newPlacements.length > 0) {
            const { data: inserted, error: insError } = await supabase
                .from('student_subject_classes')
                .insert(newPlacements)
                .select();

            if (insError) throw insError;

            const mapped = (inserted || []).map(ssc => ({ ...ssc, studentId: ssc.student_id, subjectClassId: ssc.subject_class_id }));

            setStudentSubjectClasses(prev => [
                ...prev.filter(ssc => ssc.studentId !== studentId),
                ...mapped,
            ]);

            return mapped;
        }

        return [];
    }, [subjectClasses, studentSubjectClasses]);

    const manualAssignSubjectClass = async (studentId: string, subjectClassId: string) => {
        const targetClass = subjectClasses.find(sc => sc.id === subjectClassId);
        if (!targetClass) return;

        // Ensure student has the subject in student_subjects (for student dashboard visibility)
        const hasSubject = studentSubjects.some(ss => ss.studentId === studentId && ss.subjectId === targetClass.subjectId);
        if (!hasSubject) {
            const { error: ssErr } = await supabase
                .from('student_subjects')
                .insert({ student_id: studentId, subject_id: targetClass.subjectId });
            if (!ssErr) {
                setStudentSubjects(prev => [...prev, { id: `temp-${studentId}-${targetClass.subjectId}`, studentId, subjectId: targetClass.subjectId }]);
            }
        }

        // Find existing for same subject to replace
        const existingPlacements = studentSubjectClasses.filter(ssc => {
            const sc = subjectClasses.find(c => c.id === ssc.subjectClassId);
            return ssc.studentId === studentId && sc?.subjectId === targetClass.subjectId;
        });

        if (existingPlacements.length > 0) {
            await supabase
                .from('student_subject_classes')
                .delete()
                .in('id', existingPlacements.map(p => p.id));
        }

        const { data: newSSC, error } = await supabase
            .from('student_subject_classes')
            .insert({ student_id: studentId, subject_class_id: subjectClassId })
            .select()
            .single();

        if (error) throw error;

        const mapped = { ...newSSC, studentId: newSSC.student_id, subjectClassId: newSSC.subject_class_id };

        setStudentSubjectClasses(prev => {
            const filtered = prev.filter(ssc => !existingPlacements.find(e => e.id === ssc.id));
            return [...filtered, mapped];
        });
    };

    const getStudentSubjectClasses = (studentId: string) => {
        return studentSubjectClasses.filter(ssc => ssc.studentId === studentId);
    };

    const getSubjectClassStudents = (subjectClassId: string) => {
        const studentIds = studentSubjectClasses
            .filter(ssc => ssc.subjectClassId === subjectClassId)
            .map(ssc => ssc.studentId);
        return students.filter(s => studentIds.includes(s.id));
    };

    const removeStudentFromSubjectClass = async (studentId: string, subjectClassId: string) => {
        const { error } = await supabase
            .from('student_subject_classes')
            .delete()
            .eq('student_id', studentId)
            .eq('subject_class_id', subjectClassId);

        if (error) throw error;

        setStudentSubjectClasses(prev =>
            prev.filter(ssc => !(ssc.studentId === studentId && ssc.subjectClassId === subjectClassId))
        );
    };

    const getRegisterClassStudents = (registerClassId: string) => {
        return students.filter(s => s.registerClassId === registerClassId);
    };

    return {
        grades,
        registerClasses,
        subjectClasses,
        students,
        studentSubjects,
        studentSubjectClasses,
        loading,
        addGrade,
        addRegisterClass,
        updateRegisterClass,
        deleteRegisterClass,
        addSubjectClass,
        updateSubjectClass,
        deleteSubjectClass,
        addStudent,
        updateStudent,
        deleteStudent,
        assignSubjectsToStudent,
        getStudentSubjects,
        autoAssignSubjectClasses,
        manualAssignSubjectClass,
        removeStudentFromSubjectClass,
        getStudentSubjectClasses,
        getSubjectClassStudents,
        getRegisterClassStudents,
        getSubjectClassEnrollment,
    };
}

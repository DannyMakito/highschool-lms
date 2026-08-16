import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { StudentAssignedSubject } from '../../types';

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

export function useRegistrationQuery() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['registrationData', user?.id],
        queryFn: async () => {
            if (!user) throw new Error("No user");

            const [gradesRes, rcRes, scRes, studentsDirectRes, ssRes, sscRes] = await Promise.all([
                supabase.from('grades').select('*'),
                supabase.from('register_classes').select('*'),
                supabase.from('subject_classes').select('*'),
                supabase.from('students').select(`*, profiles(*)`),
                supabase.from('student_subjects').select(`*, subjects(name)`),
                supabase.from('student_subject_classes').select('*'),
            ]);

            const [studentsRpcRes, studentsViewRes] = await Promise.all([
                (async () => { try { return await supabase.rpc('get_students_with_subjects'); } catch { return { data: null, error: null }; } })(),
                (async () => { try { return await supabase.from('students_with_subjects').select('*'); } catch { return { data: null, error: null }; } })(),
            ]);

            const gradesData = gradesRes.data || [];
            const rcData = rcRes.data || [];
            const scData = scRes.data || [];

            const studentsDirectData = Array.isArray(studentsDirectRes.data) ? studentsDirectRes.data : [];
            const studentsRpcData = Array.isArray(studentsRpcRes.data) ? studentsRpcRes.data : [];
            const studentsViewData = Array.isArray(studentsViewRes.data) ? studentsViewRes.data : [];

            const studentsData = studentsDirectData.length > 0 ? studentsDirectData :
                (studentsRpcData.length > 0 ? studentsRpcData : studentsViewData);

            const ssData = ssRes.data || [];
            const sscData = sscRes.data || [];

            const studentSubjectsByStudentId = ssData.reduce<Record<string, StudentAssignedSubject[]>>((acc, item) => {
                if (!item.student_id) return acc;
                if (!acc[item.student_id]) acc[item.student_id] = [];
                acc[item.student_id].push(normalizeAssignedSubject(item));
                return acc;
            }, {});

            return {
                grades: gradesData.map((g: any) => ({
                    ...g,
                    level: g.level ?? g.sort_order ?? (parseInt(String(g.name || '').replace(/\D/g, ''), 10) || 0),
                })),
                registerClasses: rcData.map(rc => ({
                    ...rc,
                    gradeId: rc.grade_id,
                    classTeacherId: rc.class_teacher_id,
                    maxStudents: rc.max_students,
                    createdAt: rc.created_at
                })),
                subjectClasses: scData.map(sc => ({
                    ...sc,
                    subjectId: sc.subject_id,
                    teacherId: sc.teacher_id,
                    gradeId: sc.grade_id,
                    createdAt: sc.created_at
                })),
                students: studentsData.map((s: any) => ({
                    ...s,
                    firstName: (s.profiles?.full_name || s.full_name || "").split(' ')[0] || '',
                    lastName: (s.profiles?.full_name || s.full_name || "").split(' ').slice(1).join(' ') || '',
                    name: s.profiles?.full_name || s.full_name || '',
                    email: s.profiles?.email || s.email || '',
                    pin: s.profiles?.pin || s.pin || '',
                    avatarUrl: s.profiles?.avatar_url || '',
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
                })),
                studentSubjects: ssData.map(ss => ({
                    ...ss,
                    studentId: ss.student_id,
                    subjectId: ss.subject_id
                })),
                studentSubjectClasses: sscData.map(ssc => ({
                    ...ssc,
                    studentId: ssc.student_id,
                    subjectClassId: ssc.subject_class_id
                }))
            };
        },
        enabled: !!user,
    });
}

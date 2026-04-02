
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Teacher, SchoolClass, Student } from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface SchoolDataContextType {
    teachers: Teacher[];
    classes: SchoolClass[];
    students: Student[];
    loading: boolean;
    addTeacher: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => Promise<any>;
    addSchoolClass: (newClass: Omit<SchoolClass, 'id' | 'createdAt'>) => Promise<any>;
    addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'name' | 'pin'>) => Promise<any>;
    addStudentToSchoolClass: (classId: string, studentId: string) => Promise<void>;
    addSubjectToTeacher: (teacherId: string, subjectId: string) => Promise<void>;
    removeSubjectFromTeacher: (teacherId: string, subjectId: string) => Promise<void>;
}

const SchoolDataContext = createContext<SchoolDataContextType | undefined>(undefined);

export function SchoolDataProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setTeachers([]);
            setClasses([]);
            setStudents([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchSchoolData = async () => {
            setLoading(true);

            // Failsafe timer
            const timer = setTimeout(() => {
                if (!cancelled && loading) {
                    console.warn("School data fetch timed out, forcing loading to false");
                    setLoading(false);
                }
            }, 5000);

            try {
                // Fire all queries in parallel
                const [profilesRes, assignmentsRes, classesRes, studentsRes, sscRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('role', 'teacher'),
                    supabase.from('teacher_subjects').select('*'),
                    supabase.from('subject_classes').select('*'),
                    supabase.from('students').select('*, profiles(*)'),
                    supabase.from('student_subject_classes').select('*'),
                ]);

                if (cancelled) return;

                const profilesData = profilesRes.data;
                const assignmentsData = assignmentsRes.data;
                const classesData = classesRes.data;
                const studentsData = studentsRes.data;
                const sscData = sscRes.data;

                setTeachers((profilesData || []).map(p => ({
                    id: p.id,
                    name: p.full_name,
                    email: p.email,
                    pin: p.pin || '',
                    gender: '',
                    subjects: assignmentsData?.filter(a => a.teacher_id === p.id).map(a => a.subject_id) || [],
                    createdAt: p.created_at
                })));

                setClasses((classesData || []).map(sc => ({
                    id: sc.id,
                    name: sc.name,
                    teacherId: sc.teacher_id,
                    subjectId: sc.subject_id,
                    studentIds: (sscData || []).filter(p => p.subject_class_id === sc.id).map(p => p.student_id),
                    createdAt: sc.created_at
                })));

                setStudents((studentsData || []).map(s => ({
                    ...s,
                    name: s.profiles?.full_name || '',
                    email: s.profiles?.email || '',
                    pin: s.profiles?.pin || '',
                    administrationNumber: s.administration_number,
                    gender: s.gender,
                    gradeId: s.grade_id,
                    registerClassId: s.register_class_id,
                    studentClass: '',
                    grade: '',
                })));

            } catch (error) {
                console.error("Error fetching school data:", error);
            } finally {
                clearTimeout(timer);
                if (!cancelled) setLoading(false);
            }
        };

        fetchSchoolData();

        return () => { cancelled = true; };
    }, [user?.id, authLoading]);

    const addTeacher = async (teacher: Omit<Teacher, 'id' | 'createdAt'>) => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
            throw new Error("You must be logged in to create a teacher. Please log out and back in.");
        }

        const { data, error } = await supabase.functions.invoke("create-user", {
            body: {
                role: 'teacher',
                name: teacher.name,
                email: teacher.email,
                pin: teacher.pin,
                subjects: teacher.subjects
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (error) throw error;

        const created = data as { id: string; created_at?: string };
        const newTeacher: Teacher = {
            ...teacher,
            id: created.id,
            createdAt: created.created_at || new Date().toISOString()
        };
        setTeachers(prev => [...prev, newTeacher]);
        return newTeacher;
    };

    const addSchoolClass = async (newClass: Omit<SchoolClass, 'id' | 'createdAt'>) => {
        const { data: sc, error } = await supabase
            .from('subject_classes')
            .insert({
                name: newClass.name,
                teacher_id: newClass.teacherId,
                subject_id: newClass.subjectId,
                grade_id: 'g10'
            })
            .select()
            .single();

        if (error) throw error;

        const classToAdd: SchoolClass = {
            id: sc.id,
            name: sc.name,
            teacherId: sc.teacher_id || '',
            subjectId: sc.subject_id,
            studentIds: [],
            createdAt: sc.created_at
        };
        setClasses(prev => [...prev, classToAdd]);
        return classToAdd;
    };

    const addStudent = async (student: Omit<Student, 'id' | 'createdAt' | 'name' | 'pin'>) => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error("You must be logged in to register a student. Please log out and back in.");
        }

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
                status: student.status || 'active'
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (error) throw error;

        const created = data as { id: string; created_at?: string; pin: string };
        const newStudent: Student = {
            ...student,
            id: created.id,
            name: `${student.firstName} ${student.lastName}`,
            pin: created.pin,
            grade: student.grade,
            studentClass: student.studentClass,
            createdAt: created.created_at || new Date().toISOString()
        };
        setStudents(prev => [...prev, newStudent]);
        return newStudent;
    };

    const addStudentToSchoolClass = async (classId: string, studentId: string) => {
        const { error } = await supabase
            .from('student_subject_classes')
            .insert({
                student_id: studentId,
                subject_class_id: classId
            });

        if (error) throw error;

        setClasses(prev => prev.map(c => {
            if (c.id === classId) {
                if (c.studentIds.includes(studentId)) return c;
                return { ...c, studentIds: [...c.studentIds, studentId] };
            }
            return c;
        }));
    };

    const addSubjectToTeacher = async (teacherId: string, subjectId: string) => {
        const { error } = await supabase
            .from('teacher_subjects')
            .insert({
                teacher_id: teacherId,
                subject_id: subjectId
            });

        if (error) throw error;

        // Update local state
        setTeachers(prev => prev.map(t => {
            if (t.id === teacherId && !t.subjects.includes(subjectId)) {
                return { ...t, subjects: [...t.subjects, subjectId] };
            }
            return t;
        }));
    };

    const removeSubjectFromTeacher = async (teacherId: string, subjectId: string) => {
        const { error } = await supabase
            .from('teacher_subjects')
            .delete()
            .eq('teacher_id', teacherId)
            .eq('subject_id', subjectId);

        if (error) throw error;

        // Update local state
        setTeachers(prev => prev.map(t => {
            if (t.id === teacherId) {
                return { ...t, subjects: t.subjects.filter(s => s !== subjectId) };
            }
            return t;
        }));
    };

    const value: SchoolDataContextType = {
        teachers,
        classes,
        students,
        loading,
        addTeacher,
        addSchoolClass,
        addStudent,
        addStudentToSchoolClass,
        addSubjectToTeacher,
        removeSubjectFromTeacher,
    };

    return <SchoolDataContext.Provider value={value}>{children}</SchoolDataContext.Provider>;
}

export function useSchoolDataContext() {
    const context = useContext(SchoolDataContext);
    if (context === undefined) {
        throw new Error("useSchoolDataContext must be used within a SchoolDataProvider");
    }
    return context;
}


import { useState, useEffect } from 'react';
import type { Teacher, SchoolClass, Student } from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useSchoolData() {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchSchoolData = async () => {
            setLoading(true);
            try {

                // Fetch teachers from profiles
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'teacher');

                // Fetch teacher-subject assignments
                const { data: assignmentsData } = await supabase
                    .from('teacher_subjects')
                    .select('*');

                // Fetch subject classes
                const { data: classesData } = await supabase
                    .from('subject_classes')
                    .select('*');

                // Fetch students (joining profiles)
                const { data: studentsData } = await supabase
                    .from('students')
                    .select('*, profiles(*)');

                // Fetch student placements
                const { data: sscData } = await supabase
                    .from('student_subject_classes')
                    .select('*');

                if (cancelled) return;

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
                if (!cancelled) setLoading(false);
            }
        };

        fetchSchoolData();

        return () => { cancelled = true; };
    }, [user?.id]);

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
        // Map legacy SchoolClass to subject_classes
        const { data: sc, error } = await supabase
            .from('subject_classes')
            .insert({
                name: newClass.name,
                teacher_id: newClass.teacherId,
                subject_id: newClass.subjectId,
                grade_id: 'g10' // Default or needed in schema
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
            grade: grades.find(g => g.id === student.gradeId)?.name || '',
            studentClass: registerClasses.find(rc => rc.id === student.registerClassId)?.name || '',
            createdAt: created.created_at || new Date().toISOString()
        };
        setStudents(prev => [...prev, newStudent]);
        return newStudent;
    };

    const addStudentToSchoolClass = async (classId: string, studentId: string) => {
        // Map to student_subject_classes
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

    return {
        teachers,
        classes,
        students,
        loading,
        addTeacher,
        addSchoolClass,
        addStudent,
        addStudentToSchoolClass,
    };
}

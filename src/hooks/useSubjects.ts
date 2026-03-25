
import { useState, useEffect, useCallback } from 'react';
import type { Subject, Topic, Lesson, Quiz, QuizSubmission } from '../types';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface LMSData {
    subjects: Subject[];
    topics: Topic[];
    lessons: Lesson[];
    quizzes: Quiz[];
    submissions: QuizSubmission[];
    completedLessonIds: string[];
    lastLesson?: {
        subjectId: string;
        lessonId: string;
    };
}

export function useSubjects() {
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState<LMSData>({
        subjects: [],
        topics: [],
        lessons: [],
        quizzes: [],
        submissions: [],
        completedLessonIds: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            try {

                const { data: subjects } = await supabase.from('subjects').select('*');
                const { data: topics } = await supabase.from('topics').select('*');
                const { data: lessons } = await supabase.from('lessons').select('*');
                const { data: quizzes } = await supabase.from('quizzes').select('*');
                const { data: submissions } = await supabase.from('quiz_submissions').select('*');
                const { data: progress } = user ? await supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user.id) : { data: [] };

                if (cancelled) return;

                const mappedSubjects = (subjects || []).map(s => {
                    const subjectTopics = (topics || []).filter(t => t.subject_id === s.id);
                    const topicIds = subjectTopics.map(t => t.id);
                    const subjectLessons = (lessons || []).filter(l => topicIds.includes(l.topic_id));

                    return {
                        ...s,
                        gradeTier: s.grade_tier,
                        accessType: s.access_type,
                        modulesCount: subjectTopics.length,
                        lessonsCount: subjectLessons.length
                    };
                });

                setData({
                    subjects: mappedSubjects,
                    topics: (topics || []).map(t => ({ ...t, subjectId: t.subject_id })),
                    lessons: (lessons || []).map(l => ({ ...l, topicId: l.topic_id, videoUrl: l.video_url })),
                    quizzes: (quizzes || []).map(q => ({ ...q, subjectId: q.subject_id })),
                    submissions: (submissions || []).map(sub => ({ ...sub, quizId: sub.quiz_id, studentId: sub.student_id })),
                    completedLessonIds: progress?.map(p => p.lesson_id) || [],
                });
            } catch (error) {
                console.error("Error fetching LMS data:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();

        return () => { cancelled = true; };
    }, [user?.id, authLoading]);

    const addSubject = async (subject: Omit<Subject, 'id' | 'modulesCount' | 'lessonsCount' | 'createdAt'>) => {
        const { data: newSubject, error } = await supabase
            .from('subjects')
            .insert({
                name: subject.name,
                description: subject.description,
                thumbnail: subject.thumbnail,
                grade_tier: subject.gradeTier,
                category: subject.category,
                access_type: subject.accessType
            })
            .select()
            .single();

        if (error) throw error;

        setData(prev => ({
            ...prev,
            subjects: [...prev.subjects, { ...newSubject, modulesCount: 0, lessonsCount: 0, gradeTier: newSubject.grade_tier, accessType: newSubject.access_type }]
        }));
        return newSubject;
    };

    const addTopic = async (topic: Omit<Topic, 'id'>) => {
        const { data: newTopic, error } = await supabase
            .from('topics')
            .insert({
                subject_id: topic.subjectId,
                title: topic.title,
                order: topic.order
            })
            .select()
            .single();

        if (error) throw error;

        setData(prev => ({
            ...prev,
            topics: [...prev.topics, { ...newTopic, subjectId: newTopic.subject_id }],
            subjects: prev.subjects.map(s => s.id === topic.subjectId ? { ...s, modulesCount: s.modulesCount + 1 } : s)
        }));
        return newTopic;
    };

    const addLesson = async (lesson: Omit<Lesson, 'id'>) => {
        const { data: newLesson, error } = await supabase
            .from('lessons')
            .insert({
                topic_id: lesson.topicId,
                title: lesson.title,
                content: lesson.content,
                video_url: lesson.videoUrl,
                order: lesson.order
            })
            .select()
            .single();

        if (error) throw error;

        setData(prev => {
            const topic = prev.topics.find(t => t.id === lesson.topicId);
            return {
                ...prev,
                lessons: [...prev.lessons, { ...newLesson, topicId: newLesson.topic_id, videoUrl: newLesson.video_url }],
                subjects: prev.subjects.map(s => s.id === topic?.subjectId ? { ...s, lessonsCount: s.lessonsCount + 1 } : s)
            };
        });
        return newLesson;
    };

    const updateLesson = async (id: string, updates: Partial<Lesson>) => {
        const { error } = await supabase
            .from('lessons')
            .update({
                title: updates.title,
                content: updates.content,
                video_url: updates.videoUrl,
                order: updates.order
            })
            .eq('id', id);

        if (error) throw error;

        setData(prev => ({
            ...prev,
            lessons: prev.lessons.map(l => l.id === id ? { ...l, ...updates } : l)
        }));
    };

    const updateTopic = async (id: string, updates: Partial<Topic>) => {
        const { error } = await supabase
            .from('topics')
            .update({
                title: updates.title,
                order: updates.order
            })
            .eq('id', id);

        if (error) throw error;

        setData(prev => ({
            ...prev,
            topics: prev.topics.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
    };

    const addQuiz = async (quiz: Quiz) => {
        const { error } = await supabase
            .from('quizzes')
            .upsert({
                id: quiz.id,
                subject_id: quiz.subjectId,
                title: quiz.title,
                description: quiz.description,
                status: quiz.status,
                settings: quiz.settings,
            });

        if (error) throw error;

        // Note: Questions would normally be in a separate table, but for simplicity we keep them as part of the quiz object in our types.
        // If the DB schema has a separate questions table, we'd need to sync that too.

        setData(prev => ({
            ...prev,
            quizzes: [...prev.quizzes.filter(q => q.id !== quiz.id), quiz]
        }));
    };

    const getSubjectTopics = useCallback((subjectId: string) => {
        return data.topics.filter(t => t.subjectId === subjectId).sort((a, b) => a.order - b.order);
    }, [data.topics]);

    const getTopicLessons = useCallback((topicId: string) => {
        return data.lessons.filter(l => l.topicId === topicId).sort((a, b) => a.order - b.order);
    }, [data.lessons]);

    const getSubjectQuizzes = useCallback((subjectId: string) => {
        return data.quizzes.filter(q => q.subjectId === subjectId);
    }, [data.quizzes]);

    const getQuizSubmissions = useCallback((quizId: string) => {
        return data.submissions.filter(s => s.quizId === quizId);
    }, [data.submissions]);

    const addSubmission = async (submission: QuizSubmission) => {
        const { error } = await supabase
            .from('quiz_submissions')
            .insert({
                quiz_id: submission.quizId,
                student_id: submission.studentId,
                score: submission.score,
                accuracy: submission.accuracy,
                time_spent: submission.timeSpent,
                status: submission.status,
                answers: submission.answers,
                completed_at: submission.completedAt
            });

        if (error) throw error;

        setData(prev => ({
            ...prev,
            submissions: [...prev.submissions, submission]
        }));
    };

    const toggleLessonCompletion = async (lessonId: string) => {
        if (!user) return;

        const isCompleted = data.completedLessonIds.includes(lessonId);

        if (isCompleted) {
            const { error } = await supabase
                .from('user_lesson_progress')
                .delete()
                .eq('user_id', user.id)
                .eq('lesson_id', lessonId);

            if (error) throw error;

            setData(prev => ({
                ...prev,
                completedLessonIds: prev.completedLessonIds.filter(id => id !== lessonId)
            }));
        } else {
            const { error } = await supabase
                .from('user_lesson_progress')
                .insert({ user_id: user.id, lesson_id: lessonId });

            if (error) throw error;

            setData(prev => ({
                ...prev,
                completedLessonIds: [...prev.completedLessonIds, lessonId]
            }));
        }
    };

    const isLessonCompleted = useCallback((lessonId: string) => {
        return data.completedLessonIds.includes(lessonId);
    }, [data.completedLessonIds]);

    const getSubjectProgress = useCallback((subjectId: string) => {
        const subjectTopics = data.topics.filter(t => t.subjectId === subjectId);
        const subjectTopicIds = subjectTopics.map(t => t.id);
        const subjectLessons = data.lessons.filter(l => subjectTopicIds.includes(l.topicId));

        if (subjectLessons.length === 0) return 0;

        const completedCount = subjectLessons.filter(l => data.completedLessonIds.includes(l.id)).length;
        return Math.round((completedCount / subjectLessons.length) * 100);
    }, [data.topics, data.lessons, data.completedLessonIds]);

    const getSubjectLessonsCount = useCallback((subjectId: string) => {
        const subjectTopics = data.topics.filter(t => t.subjectId === subjectId);
        const subjectTopicIds = subjectTopics.map(t => t.id);
        return data.lessons.filter(l => subjectTopicIds.includes(l.topicId)).length;
    }, [data.topics, data.lessons]);

    const getSubjectCompletedLessonsCount = useCallback((subjectId: string) => {
        const subjectTopics = data.topics.filter(t => t.subjectId === subjectId);
        const subjectTopicIds = subjectTopics.map(t => t.id);
        const subjectLessons = data.lessons.filter(l => subjectTopicIds.includes(l.topicId));
        return subjectLessons.filter(l => data.completedLessonIds.includes(l.id)).length;
    }, [data.topics, data.lessons, data.completedLessonIds]);

    const deleteQuizzes = async (quizIds: string[]) => {
        const { error } = await supabase
            .from('quizzes')
            .delete()
            .in('id', quizIds);

        if (error) throw error;

        setData(prev => ({
            ...prev,
            quizzes: prev.quizzes.filter(q => !quizIds.includes(q.id))
        }));
    };

    const deleteSubject = async (subjectId: string) => {
        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', subjectId);

        if (error) throw error;

        setData(prev => {
            const subjectTopics = prev.topics.filter(t => t.subjectId === subjectId);
            const topicIds = subjectTopics.map(t => t.id);

            return {
                ...prev,
                subjects: prev.subjects.filter(s => s.id !== subjectId),
                topics: prev.topics.filter(t => t.subjectId !== subjectId),
                lessons: prev.lessons.filter(l => !topicIds.includes(l.topicId)),
                quizzes: prev.quizzes.filter(q => q.subjectId !== subjectId),
            };
        });
    };

    const setLastLesson = useCallback((subjectId: string, lessonId: string) => {
        setData(prev => {
            if (prev.lastLesson?.subjectId === subjectId && prev.lastLesson?.lessonId === lessonId) {
                return prev;
            }
            return {
                ...prev,
                lastLesson: { subjectId, lessonId }
            };
        });
    }, []);

    return {
        subjects: data.subjects,
        lessons: data.lessons,
        quizzes: data.quizzes,
        submissions: data.submissions,
        loading,
        addSubject,
        addTopic,
        updateTopic,
        addLesson,
        updateLesson,
        addQuiz,
        deleteQuizzes,
        deleteSubject,
        addSubmission,
        getSubjectTopics,
        getTopicLessons,
        getSubjectQuizzes,
        getQuizSubmissions,
        toggleLessonCompletion,
        isLessonCompleted,
        getSubjectProgress,
        getSubjectLessonsCount,
        getSubjectCompletedLessonsCount,
        lastLesson: data.lastLesson,
        setLastLesson
    };
}


import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
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

interface SubjectsContextType {
    subjects: Subject[];
    lessons: Lesson[];
    quizzes: Quiz[];
    submissions: QuizSubmission[];
    loading: boolean;
    addSubject: (subject: Omit<Subject, 'id' | 'modulesCount' | 'lessonsCount' | 'createdAt'>) => Promise<any>;
    addTopic: (topic: Omit<Topic, 'id'>) => Promise<any>;
    updateTopic: (id: string, updates: Partial<Topic>) => Promise<void>;
    addLesson: (lesson: Omit<Lesson, 'id'>) => Promise<any>;
    updateLesson: (id: string, updates: Partial<Lesson>) => Promise<void>;
    deleteLesson: (id: string) => Promise<void>;
    addQuiz: (quiz: Quiz) => Promise<void>;
    updateQuiz: (id: string, updates: Partial<Quiz>) => Promise<void>;
    deleteQuizzes: (quizIds: string[]) => Promise<void>;
    deleteSubject: (subjectId: string) => Promise<void>;
    addSubmission: (submission: QuizSubmission) => Promise<void>;
    getSubjectTopics: (subjectId: string) => Topic[];
    getTopicLessons: (topicId: string) => Lesson[];
    getSubjectQuizzes: (subjectId: string) => Quiz[];
    getQuizSubmissions: (quizId: string) => QuizSubmission[];
    toggleLessonCompletion: (lessonId: string) => Promise<void>;
    isLessonCompleted: (lessonId: string) => boolean;
    getSubjectProgress: (subjectId: string) => number;
    getSubjectLessonsCount: (subjectId: string) => number;
    getSubjectCompletedLessonsCount: (subjectId: string) => number;
    lastLesson?: { subjectId: string; lessonId: string };
    setLastLesson: (subjectId: string, lessonId: string) => void;
}

const SubjectsContext = createContext<SubjectsContextType | undefined>(undefined);

export function SubjectsProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [progressTrackingAvailable, setProgressTrackingAvailable] = useState(true);
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

                const [subjectsRes, topicsRes, lessonsRes, quizzesRes, submissionsRes, progressRes] = await Promise.all([
                    supabase.from('subjects').select('*'),
                    supabase.from('topics').select('*'),
                    supabase.from('lessons').select('*'),
                    supabase.from('quizzes').select('*'),
                    supabase.from('quiz_submissions').select('*'),
                    user ? supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user.id) : Promise.resolve({ data: [] as any[], error: null }),
                ]);

                const subjects = subjectsRes.data;
                const topics = topicsRes.data;
                const lessons = lessonsRes.data;
                const quizzes = quizzesRes.data;
                const submissions = submissionsRes.data;
                const progress = progressRes.data;
                const progressError = progressRes.error;

                if (progressError) {
                    if (progressError.code === 'PGRST205') {
                        setProgressTrackingAvailable(false);
                    }
                    console.warn("user_lesson_progress table not found, skipping progress tracking:", progressError.message);
                } else {
                    setProgressTrackingAvailable(true);
                }

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
                    lessons: (lessons || []).map(l => ({
                        ...l,
                        topicId: l.topic_id,
                        videoUrl: l.video_url,
                        videoType: l.video_type,
                        videoFilePath: l.video_file_path,
                        videoFileName: l.video_file_name,
                        videoMimeType: l.video_mime_type,
                        resourceUrl: l.resource_url,
                        resourceType: l.resource_type,
                        resourceFilePath: l.resource_file_path,
                        resourceFileName: l.resource_file_name,
                        resourceMimeType: l.resource_mime_type
                    })),
                    quizzes: (quizzes || []).map(q => ({ 
                        ...q, 
                        subjectId: q.subject_id,
                        settingsConfigured: q.settings_configured || false,
                        groupId: q.group_id,
                        countsTowardsFinal: q.counts_towards_final ?? true,
                        pointsPossible: q.points_possible ?? (Array.isArray(q.questions) ? q.questions.reduce((sum: number, question: any) => sum + (question.points || 0), 0) : 0)
                    })),
                    submissions: (submissions || []).map(sub => ({ 
                        ...sub, 
                        quizId: sub.quiz_id, 
                        studentId: sub.student_id,
                        studentName: sub.student_name,
                        totalPoints: sub.total_points,
                        timeSpent: sub.time_spent,
                        completedAt: sub.completed_at
                    })),
                    completedLessonIds: (progress && !progressError) ? progress.map((p: any) => p.lesson_id) : [],
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
                video_type: lesson.videoType,
                video_file_path: lesson.videoFilePath,
                video_file_name: lesson.videoFileName,
                video_mime_type: lesson.videoMimeType,
                resource_url: lesson.resourceUrl,
                resource_type: lesson.resourceType,
                resource_file_path: lesson.resourceFilePath,
                resource_file_name: lesson.resourceFileName,
                resource_mime_type: lesson.resourceMimeType,
                order: lesson.order
            })
            .select()
            .single();

        if (error) throw error;

        setData(prev => {
            const topic = prev.topics.find(t => t.id === lesson.topicId);
            return {
                ...prev,
                lessons: [...prev.lessons, {
                    ...newLesson,
                    topicId: newLesson.topic_id,
                    videoUrl: newLesson.video_url,
                    videoType: newLesson.video_type,
                    videoFilePath: newLesson.video_file_path,
                    videoFileName: newLesson.video_file_name,
                    videoMimeType: newLesson.video_mime_type,
                    resourceUrl: newLesson.resource_url,
                    resourceType: newLesson.resource_type,
                    resourceFilePath: newLesson.resource_file_path,
                    resourceFileName: newLesson.resource_file_name,
                    resourceMimeType: newLesson.resource_mime_type
                }],
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
                video_type: updates.videoType,
                video_file_path: updates.videoFilePath,
                video_file_name: updates.videoFileName,
                video_mime_type: updates.videoMimeType,
                resource_url: updates.resourceUrl,
                resource_type: updates.resourceType,
                resource_file_path: updates.resourceFilePath,
                resource_file_name: updates.resourceFileName,
                resource_mime_type: updates.resourceMimeType,
                order: updates.order
            })
            .eq('id', id);

        if (error) throw error;

        setData(prev => ({
            ...prev,
            lessons: prev.lessons.map(l => l.id === id ? { ...l, ...updates } : l)
        }));
    };

    const deleteLesson = async (id: string) => {
        const lessonToDelete = data.lessons.find(lesson => lesson.id === id);

        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', id);

        if (error) throw error;

        setData(prev => {
            const topic = lessonToDelete ? prev.topics.find(item => item.id === lessonToDelete.topicId) : undefined;

            return {
                ...prev,
                lessons: prev.lessons.filter(lesson => lesson.id !== id),
                subjects: prev.subjects.map(subject => (
                    subject.id === topic?.subjectId
                        ? { ...subject, lessonsCount: Math.max(0, subject.lessonsCount - 1) }
                        : subject
                ))
            };
        });
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
                questions: quiz.questions,
                settings_configured: quiz.settingsConfigured,
                group_id: quiz.groupId || null,
                counts_towards_final: quiz.countsTowardsFinal ?? true,
                points_possible: quiz.pointsPossible ?? quiz.questions.reduce((sum, question) => sum + (question.points || 0), 0),
            });

        if (error) throw error;

        setData(prev => ({
            ...prev,
            quizzes: [...prev.quizzes.filter(q => q.id !== quiz.id), quiz]
        }));
    };

    const updateQuiz = async (id: string, updates: Partial<Quiz>) => {
        const payload: Record<string, unknown> = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.settings !== undefined) payload.settings = updates.settings;
        if (updates.questions !== undefined) payload.questions = updates.questions;
        if (updates.settingsConfigured !== undefined) payload.settings_configured = updates.settingsConfigured;
        if (updates.groupId !== undefined) payload.group_id = updates.groupId;
        if (updates.countsTowardsFinal !== undefined) payload.counts_towards_final = updates.countsTowardsFinal;
        if (updates.pointsPossible !== undefined) payload.points_possible = updates.pointsPossible;

        const { error } = await supabase
            .from('quizzes')
            .update(payload)
            .eq('id', id);

        if (error) throw error;

        setData(prev => ({
            ...prev,
            quizzes: prev.quizzes.map(quiz => quiz.id === id ? { ...quiz, ...updates } : quiz)
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
                id: submission.id,
                quiz_id: submission.quizId,
                student_id: submission.studentId,
                student_name: submission.studentName,
                score: submission.score,
                total_points: submission.totalPoints,
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
        if (!user || !progressTrackingAvailable) return;

        const isCompleted = data.completedLessonIds.includes(lessonId);
        
        // Optimistic update for instant UI feedback
        setData(prev => ({
            ...prev,
            completedLessonIds: isCompleted 
                ? prev.completedLessonIds.filter(id => id !== lessonId)
                : [...prev.completedLessonIds, lessonId]
        }));

        try {
            if (isCompleted) {
                const { error } = await supabase
                    .from('user_lesson_progress')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('lesson_id', lessonId);

                if (error) {
                    // Rollback on error
                    setData(prev => ({
                        ...prev,
                        completedLessonIds: [...prev.completedLessonIds, lessonId]
                    }));
                    throw error;
                }
            } else {
                const { error } = await supabase
                    .from('user_lesson_progress')
                    .insert({ user_id: user.id, lesson_id: lessonId });

                if (error) {
                    // Rollback on error
                    setData(prev => ({
                        ...prev,
                        completedLessonIds: prev.completedLessonIds.filter(id => id !== lessonId)
                    }));
                    throw error;
                }
            }
        } catch (error: any) {
            console.error("Error toggling progress:", error);
            // If it's a permission/RLS error, it might mean the table or policy is misconfigured.
            if (error.code === '42P01' || error.code === 'PGRST204') {
                setProgressTrackingAvailable(false);
            }
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

    const value: SubjectsContextType = {
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
        deleteLesson,
        addQuiz,
        updateQuiz,
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

    return <SubjectsContext.Provider value={value}>{children}</SubjectsContext.Provider>;
}

export function useSubjectsContext() {
    const context = useContext(SubjectsContext);
    if (context === undefined) {
        throw new Error("useSubjectsContext must be used within a SubjectsProvider");
    }
    return context;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export function useSubjectsQuery() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['subjectsData', user?.id],
        queryFn: async () => {
            if (!user) throw new Error("No user");

            const [subjectsRes, topicsRes, lessonsRes, quizzesRes, submissionsRes, progressRes] = await Promise.all([
                supabase.from('subjects').select('*'),
                supabase.from('topics').select('*'),
                supabase.from('lessons').select('*'),
                supabase.from('quizzes').select('*'),
                supabase.from('quiz_submissions').select('*'),
                supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user.id)
            ]);

            const progressError = progressRes.error;
            let progressTrackingAvailable = true;
            if (progressError && progressError.code === 'PGRST205') {
                progressTrackingAvailable = false;
            }

            const subjects = subjectsRes.data || [];
            const topics = topicsRes.data || [];
            const lessons = lessonsRes.data || [];
            const quizzes = quizzesRes.data || [];
            const submissions = submissionsRes.data || [];
            const progress = progressRes.data || [];

            const mappedSubjects = subjects.map(s => {
                const subjectTopics = topics.filter(t => t.subject_id === s.id);
                const topicIds = subjectTopics.map(t => t.id);
                const subjectLessons = lessons.filter(l => topicIds.includes(l.topic_id));
                
                return {
                    ...s,
                    gradeTier: s.grade_tier,
                    accessType: s.access_type,
                    modulesCount: subjectTopics.length,
                    lessonsCount: subjectLessons.length
                };
            });

            return {
                subjects: mappedSubjects,
                topics: topics.map(t => ({ ...t, subjectId: t.subject_id })),
                lessons: lessons.map(l => ({
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
                quizzes: quizzes.map(q => ({
                    ...q,
                    subjectId: q.subject_id,
                    settingsConfigured: q.settings_configured || false,
                    groupId: q.group_id,
                    countsTowardsFinal: q.counts_towards_final ?? true,
                    pointsPossible: q.points_possible ?? (Array.isArray(q.questions) ? q.questions.reduce((sum: number, question: any) => sum + (question.points || 0), 0) : 0),
                    timeLimitMinutes: q.time_limit_minutes,
                    passingScorePercentage: q.passing_score_percentage,
                    isPublished: q.is_published,
                    dueDate: q.due_date
                })),
                submissions: submissions.map(s => ({
                    ...s,
                    quizId: s.quiz_id,
                    studentId: s.student_id,
                    studentName: s.student_name,
                    totalPoints: s.total_points,
                    timeSpent: s.time_spent,
                    completedAt: s.completed_at,
                    submittedAt: s.submitted_at
                })),
                completedLessonIds: (!progressError) ? progress.map((p: any) => p.lesson_id) : [],
                progressTrackingAvailable
            };
        },
        enabled: !!user,
    });
}

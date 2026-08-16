import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { BookOpen, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { useAssignmentsContext } from '../../src/context/AssignmentsContext';
import { useSubjectsContext } from '../../src/context/SubjectsContext';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { HtmlContent } from '../../components/ui/html-content';

function getPreviewText(htmlOrText: string | undefined, maxWords = 10) {
  if (!htmlOrText) return 'No description provided.';

  const plainText = htmlOrText
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const words = plainText.split(' ').filter(Boolean);
  if (words.length <= maxWords) return plainText;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

export default function AssignmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { assignments, submissions, loading: assignmentsLoading } = useAssignmentsContext();
  const { subjects } = useSubjectsContext();
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('student_subjects')
        .select('subject_id')
        .eq('student_id', user.id);
      if (!cancelled) {
        setEnrolledIds((data || []).map((r: any) => r.subject_id));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const enrolledSubjects = useMemo(() => {
    return subjects.filter((s) => enrolledIds.includes(s.id));
  }, [subjects, enrolledIds]);

  const assignmentsBySubject = useMemo(() => {
    const map: Record<string, typeof assignments> = {};
    for (const subject of enrolledSubjects) {
      map[subject.id] = assignments.filter((a) => a.subjectId === subject.id);
    }
    return map;
  }, [assignments, enrolledSubjects]);

  const getSubmissionStatus = (assignmentId: string) => {
    const sub = submissions.find((s) => s.assignmentId === assignmentId);
    if (!sub) return null;
    return sub.status;
  };

  if (assignmentsLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 14 }}>Loading assignments...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 4 }}>Assignments</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 }}>
        Tap an assignment to open the full detail view and submit your work.
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/grades')}
        style={{
          backgroundColor: '#f9fafb',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignSelf: 'flex-start',
          marginBottom: 28,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Open Grades Page</Text>
      </TouchableOpacity>

      {enrolledSubjects.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <BookOpen color="#d1d5db" size={48} />
          <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 12 }}>No subjects assigned yet</Text>
        </View>
      ) : (
        enrolledSubjects.map((subject) => {
          const subjectAssignments = assignmentsBySubject[subject.id] || [];
          const taskCount = subjectAssignments.length;

          return (
            <View key={subject.id} style={{ marginBottom: 28 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {subject.name}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {subject.gradeTier ? `Grade ${subject.gradeTier} assessments` : 'assessments'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 12 }}>
                <BookOpen color="#9ca3af" size={14} />
                <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </Text>
              </View>

              {taskCount === 0 ? (
                <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
                    No assignments posted for this subject yet.
                  </Text>
                </View>
              ) : (
                subjectAssignments.map((assignment) => {
                  const subStatus = getSubmissionStatus(assignment.id);
                  const isSubmitted = subStatus === 'submitted' || subStatus === 'graded';
                  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && !isSubmitted;

                  return (
                    <TouchableOpacity
                      key={assignment.id}
                      onPress={() => router.push(`/assignments/${assignment.id}` as any)}
                      activeOpacity={0.7}
                      style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, marginBottom: 10, backgroundColor: '#fff' }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                            {assignment.title}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                            {getPreviewText(assignment.description)}
                          </Text>
                          {assignment.dueDate ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                              <Clock color="#9ca3af" size={12} />
                              <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={{ alignItems: 'center', gap: 4 }}>
                          {isSubmitted ? (
                            <CheckCircle2 color="#22c55e" size={20} />
                          ) : isOverdue ? (
                            <AlertCircle color="#ef4444" size={20} />
                          ) : (
                            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db' }} />
                          )}
                          <Text style={{ fontSize: 10, color: isSubmitted ? '#22c55e' : isOverdue ? '#ef4444' : '#9ca3af', fontWeight: '500' }}>
                            {isSubmitted ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                        {assignment.totalMarks ? (
                          <Text style={{ fontSize: 12, color: '#9ca3af' }}>{assignment.totalMarks} marks</Text>
                        ) : null}
                        {assignment.assessmentCategory ? (
                          <Text style={{ fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' }}>
                            {assignment.assessmentCategory}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

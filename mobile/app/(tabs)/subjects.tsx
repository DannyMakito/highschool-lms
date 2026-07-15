import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Search, BookOpen, Layers, ChevronRight } from 'lucide-react-native';
import { useSubjectsContext } from '../../src/context/SubjectsContext';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { useEffect } from 'react';

export default function SubjectsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { subjects, loading: subjectsLoading, getSubjectProgress } = useSubjectsContext();
  const [search, setSearch] = useState('');
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

  const filteredSubjects = useMemo(() => {
    const enrolled = subjects.filter(s => enrolledIds.includes(s.id));
    if (!search.trim()) return enrolled;
    const q = search.toLowerCase();
    return enrolled.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  }, [subjects, enrolledIds, search]);

  if (subjectsLoading || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#64748b', marginTop: 12, fontSize: 14 }}>Loading subjects...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 4 }}>My Courses</Text>
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>Courses you've started learning. Pick up where you left off.</Text>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        marginBottom: 20,
      }}>
        <Search color="#9ca3af" size={16} />
        <TextInput
          style={{ flex: 1, color: '#111827', paddingVertical: 14, marginLeft: 10, fontSize: 15 }}
          placeholder="Search subjects"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filteredSubjects.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <BookOpen color="#d1d5db" size={48} />
          <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 12 }}>
            {enrolledIds.length === 0 ? 'No subjects assigned yet' : 'No subjects match your search'}
          </Text>
        </View>
      ) : (
        filteredSubjects.map((subject) => {
          const progress = getSubjectProgress(subject.id);
          return (
            <TouchableOpacity
              key={subject.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/subjects/${subject.id}/outline`)}
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#e5e7eb',
              }}
            >
              {subject.thumbnail ? (
                <Image
                  source={{ uri: subject.thumbnail }}
                  style={{ width: '100%', height: 160, backgroundColor: '#f3f4f6' }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: '100%', height: 160, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
                  <BookOpen color="#d1d5db" size={40} />
                </View>
              )}

              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {subject.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 }} numberOfLines={1}>
                  {subject.description}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Layers color="#9ca3af" size={14} />
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>{subject.modulesCount} MODULES</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <BookOpen color="#9ca3af" size={14} />
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>{subject.lessonsCount} LESSONS</Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{progress}% DONE</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{subject.lessonsCount} LESSONS</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${progress}%`, backgroundColor: '#3b82f6', borderRadius: 3 }} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#f3f4f6',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <ChevronRight color="#9ca3af" size={18} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

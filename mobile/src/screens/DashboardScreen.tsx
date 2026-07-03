import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { OfflineSyncService } from '../lib/offline-sync';
import { TutorWidget } from '../components/TutorWidget';

export function DashboardScreen() {
  const [userEmail, setUserEmail] = useState<string | undefined>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await supabase.auth.getUser();
        if (!mounted) return;
        setUserEmail(res.data.user?.email);
      } catch (e) {
        console.error('Failed to get user in DashboardScreen', e);
        if (mounted) setUserEmail(undefined);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleTestOfflineQueue = async () => {
    // We mock an action that could be taking place offline
    // e.g. a student submitting an assignment locally
    const mockAssignmentSubmission = {
      student_id: (await supabase.auth.getUser()).data.user?.id,
      assignment_id: '123-mock-assignment-id',
      content: 'This is my offline submission!',
      submitted_at: new Date().toISOString()
    };

    await OfflineSyncService.enqueueAction({
      table: 'assignment_submissions',
      type: 'INSERT',
      payload: mockAssignmentSubmission
    });

    Alert.alert('Success', 'Action added to offline sync queue. Turn on your internet connection to sync automatically!');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '600', color: '#fff' }}>Good morning</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#94a3b8' }}>{userEmail || 'Student'} • Connected to the shared LMS</Text>
      </View>

      <View style={{ marginHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>Today’s learning</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#94a3b8' }}>Lessons, quizzes, and announcements from your school ecosystem.</Text>
        <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap' }}>
          {[
            { label: 'Assignments', value: '3 pending' },
            { label: 'Quizzes', value: '2 due' },
            { label: 'Announcements', value: '5 new' },
          ].map((item) => (
            <View key={item.label} style={{ marginRight: 8, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#020617', paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.2, color: '#64748b' }}>{item.label}</Text>
              <Text style={{ marginTop: 4, fontSize: 14, fontWeight: '600', color: '#fff' }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <TutorWidget />

      <View style={{ marginHorizontal: 16, marginBottom: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>Offline-ready sync</Text>
        <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 20, color: '#94a3b8' }}>
          Queue an assignment submission while offline and sync it back to Supabase once your connection returns.
        </Text>
        <TouchableOpacity style={{ marginTop: 14, borderRadius: 16, backgroundColor: '#16a34a', paddingVertical: 12 }} onPress={handleTestOfflineQueue}>
          <Text style={{ textAlign: 'center', fontWeight: '600', color: '#fff' }}>Submit offline</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginHorizontal: 16, marginBottom: 32, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', padding: 20 }}>
        <TouchableOpacity style={{ borderRadius: 16, borderWidth: 1, borderColor: '#475569', paddingVertical: 12 }} onPress={handleLogout}>
          <Text style={{ textAlign: 'center', fontWeight: '600', color: '#e2e8f0' }}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { env } from '../config/env';

export function TutorWidget() {
  const [prompt, setPrompt] = useState('Help me understand today’s lesson in simple terms.');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAskTutor = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const reply = await sendTutorMessage(prompt);
      setAnswer(reply);
    } catch (error) {
      setAnswer('The tutor is unavailable right now. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = useMemo(() => [
    'Summarize my last lesson',
    'Give me study tips for exams',
    'Explain this topic like I am 12',
  ], []);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155', backgroundColor: '#020617', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>AI Tutor</Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: '#cbd5e1' }}>Get quick study help that feels like part of the same LMS experience.</Text>
      <TextInput
        style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#475569', backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#fff' }}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Ask your tutor anything"
        placeholderTextColor="#94a3b8"
      />
      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
        {suggestions.map((item) => (
          <TouchableOpacity key={item} onPress={() => setPrompt(item)} style={{ marginRight: 8, marginBottom: 8, borderRadius: 999, borderWidth: 1, borderColor: '#475569', backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12, color: '#e2e8f0' }}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={handleAskTutor} style={{ marginTop: 12, borderRadius: 16, backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 12 }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ textAlign: 'center', fontWeight: '600', color: '#fff' }}>Ask Tutor</Text>}
      </TouchableOpacity>
      {answer ? (
        <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: '#0f172a', padding: 12 }}>
          <Text style={{ fontSize: 14, color: '#e2e8f0' }}>{answer}</Text>
        </View>
      ) : null}
    </View>
  );
}

    export async function sendTutorMessage(prompt: string): Promise<string> {
      if (!prompt) return '';
      try {
        const endpoint = `${env.supabaseUrl.replace(/\/$/, '')}/functions/v1/tutor`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: env.supabaseAnonKey,
          },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) throw new Error('Tutor proxy request failed');

        const data = await res.json();
        return data?.reply || 'The tutor is unavailable right now.';
      } catch (e) {
        console.error('sendTutorMessage error', e);
        return 'The tutor is unavailable right now.';
      }
    }

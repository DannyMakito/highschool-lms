import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Sparkles, Send } from 'lucide-react-native';
import { sendTutorMessage } from '../../src/components/TutorWidget';

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string };

export default function TutorScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Hello! I am your AI learning assistant. How can I help you today?' }
  ]);
  const scrollRef = useRef<ScrollView | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Auto-scroll to bottom whenever messages change
    if (scrollRef.current) {
      // small timeout to allow layout
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const reply = await sendTutorMessage(userMsg.text);
      const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', text: reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errMsg: ChatMessage = { id: `a-err-${Date.now()}`, role: 'assistant', text: 'The tutor is unavailable right now.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
      keyboardVerticalOffset={90}
    >
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-600 mr-3">
          <Sparkles color="#fff" size={20} />
        </View>
        <View>
          <Text className="text-lg font-semibold text-white">AI Tutor</Text>
          <Text className="text-xs text-slate-400">Ask me anything about your studies</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} className="flex-1 p-4">
        {messages.map((m) => (
          <View key={m.id} className={`${m.role === 'user' ? 'self-end bg-blue-600 rounded-2xl rounded-tr-sm' : 'self-start bg-slate-800 rounded-2xl rounded-tl-sm'} p-3 mb-4 max-w-[80%]`}>
            <Text className="text-white text-[15px]">{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="p-4 bg-slate-900 border-t border-slate-800 flex-row items-center">
        <TextInput 
          className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-full px-4 py-3 mr-2"
          placeholder="Type your message..."
          placeholderTextColor="#64748b"
          value={input}
          onChangeText={setInput}
          editable={!sending}
        />
        <TouchableOpacity className="h-12 w-12 rounded-full bg-blue-600 items-center justify-center" onPress={handleSend} disabled={sending}>
          <Send color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

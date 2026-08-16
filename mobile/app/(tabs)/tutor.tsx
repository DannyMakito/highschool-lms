import 'web-streams-polyfill/polyfill';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Sparkles, Send } from 'lucide-react-native';
import { env } from '../../src/config/env';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '@ai-sdk/react';
import { DirectChatTransport, ToolLoopAgent } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

function makeStreamingFetch(): typeof globalThis.fetch {
  const originalFetch = globalThis.fetch.bind(globalThis);
  const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : {
    encode(s: string) {
      const buf = new Uint8Array(s.length * 3);
      let len = 0;
      for (let i = 0; i < s.length; i++) {
        let c = s.charCodeAt(i);
        if (c < 0x80) { buf[len++] = c; }
        else if (c < 0x800) { buf[len++] = 0xc0 | (c >> 6); buf[len++] = 0x80 | (c & 0x3f); }
        else { buf[len++] = 0xe0 | (c >> 12); buf[len++] = 0x80 | ((c >> 6) & 0x3f); buf[len++] = 0x80 | (c & 0x3f); }
      }
      return buf.slice(0, len);
    },
  } as TextEncoder;
  return async (input, init) => {
    const response = await originalFetch(input, init);
    if (response.body) {
      console.log('[fetch] response.body already set');
      return response;
    }
    const text = await response.text();
    console.log('[fetch] status:', response.status, 'body length:', text.length);
    if (!text) {
      console.warn('[fetch] empty response body');
      return response;
    }
    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(textEncoder.encode(text));
          controller.close();
        },
      });
      Object.defineProperty(response, 'body', {
        value: stream,
        configurable: true,
      });
      console.log('[fetch] body set successfully');
    } catch (e) {
      console.error('[fetch] failed to set body:', e);
    }
    return response;
  };
}

import { searchSubjects } from '../../src/lib/ai/tutor-tools';
import { learnerTools } from '../../src/lib/ai/learner-tools';
// import { teacherTools } from '../../src/lib/ai/teacher-tools';
// import { principalTools } from '../../src/lib/ai/principal-tools';

function buildSystemPrompt(role: string | undefined, userName: string | undefined): string {
  const roleLabel = role || "student";
  const nameStr = userName ? ` named ${userName}` : "";

  const basePrompt = `You are a helpful high school learning assistant for our LMS. 
The user is a ${roleLabel}${nameStr}.
Use the searchSubjects tool to find relevant content in the LMS database.
Always provide helpful, educational answers based on our lesson material.

## RESPONSE FORMAT (CRITICAL - FOLLOW EXACTLY):
Your response MUST be structured exactly like ChatGPT with:
- Clear paragraphs separated by blank lines
- Numbered lists (1., 2., 3., etc.) for sequential ideas
- Bullet points (•) for related items within topics
- Markdown headings (## Title) for major sections
- NEVER use pipes (||), colons before links, or inline separators

## MARKDOWN LINK FORMAT (REQUIRED):
Always use this exact markdown format for ALL links:
[Link Text Here](/student/subjects/subjectId/outline)
[Lesson Name](/student/subjects/subjectId/lessons/lessonId)

## CONTENT RULES:
- Quote or paraphrase lesson content when answering questions
- Always recommend specific lessons for deeper learning using URLs from search results
- Format URLs exactly as provided - NEVER modify paths or invent URLs
- NEVER add "http://", "https://", or domain names to URLs

## HANDLING EMPTY TOOL RESULTS:
When a tool returns found: false, NEVER just say "no data found". Instead:
- Use the "reason" field to understand WHY there's no data
- Use any "context", "availableSubjects", or "suggestions" fields to guide the user
- Suggest next steps, encourage the user, or offer to try a different approach`;

  const roleSpecific: Record<string, string> = {
    learner: `
## YOUR ROLE-SPECIFIC TOOLS (LEARNER):
You have access to these learner-focused tools:
- **analyzeMyProgress**: Get a full progress snapshot (quiz scores, assignments, lesson completion)
- **findMyWeaknesses**: Identify topics where the student struggles
- **generateStudyPlan**: Create a personalized study plan based on deadlines and weaknesses
- **practiceQuestionGenerator**: Generate practice questions from lesson content
- **studySessionPlanner**: Plan focused study sessions with Pomodoro-style scheduling
- **explainConcept**: Get lesson content to explain concepts in simpler terms
- **flashcardGenerator**: Create flashcard Q&A pairs for revision

Use these tools proactively when the student asks about their grades, progress, study tips, or needs help understanding something. Be encouraging and supportive!`,

    teacher: `
## YOUR ROLE-SPECIFIC TOOLS (TEACHER):
You have access to these teacher-focused tools:
- **generateQuiz**: Generate quiz questions from lesson content
- **reviewStudentWork**: Review student submissions and provide feedback suggestions
- **classroomAnalytics**: Get engagement and performance analytics for your classes
- **findStruggleAreas**: Identify topics where students struggle and find underperforming students
- **teacherAtRiskStudentFinder**: Find at-risk students across your assigned subjects
- **lessonPlanAssistant**: Help plan lesson topics and structure for a subject
- **lessonContentGenerator**: Generate detailed lesson content for a specific topic

Use these tools when the teacher asks about student performance, needs help creating content, or wants analytics. Be professional and data-driven.`,

    principal: `
## YOUR ROLE-SPECIFIC TOOLS (PRINCIPAL/ADMIN):
You have access to these administrative tools:
- **schoolPerformanceDashboard**: School-wide KPIs and performance metrics
- **teacherEffectiveness**: Analyze teacher activity and student outcomes per teacher
- **atRiskStudentFinder**: Find at-risk students school-wide
- **departmentComparison**: Compare performance across subject departments
- **attendanceTrends**: Analyze login/session data for engagement patterns
- **resourceAllocation**: Identify subjects needing more resources

Use these tools when the principal asks about school performance, teacher effectiveness, or needs strategic insights. Present data clearly with actionable recommendations.`,
  };

  return basePrompt + (roleSpecific[roleLabel] || roleSpecific.learner || "") + `

You are a tutor who knows our curriculum well and helps everyone learn!`;
}

export default function TutorScreen() {
  const { user, role } = useAuth();
  const scrollRef = useRef<ScrollView | null>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }); // run on every render to stick to bottom

  // Inject user ID for tools to access
  useEffect(() => {
    (globalThis as any).__aiTutorUserId = user?.id || null;
    return () => { (globalThis as any).__aiTutorUserId = null; };
  }, [user?.id]);

  const tools = useMemo(() => {
    const base: Record<string, any> = { searchSubjects };
    if (role === "learner") return { ...base, ...learnerTools };
    return { ...base, ...learnerTools };
  }, [role]);

  const systemPrompt = useMemo(() => buildSystemPrompt(role, user?.name), [role, user?.name]);

  const chat = useChat({
    transport: new DirectChatTransport({
      agent: new ToolLoopAgent({
        model: createOpenRouter({
          apiKey: env.openRouterApiKey || "",
          compatibility: "strict",
          fetch: makeStreamingFetch(),
        })("openai/gpt-4o-mini"),
        instructions: systemPrompt,
        tools,
      })
    }),
    messages: [
      {
        id: "welcome",
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: "Hey! 👋 I'm your AI learning assistant. Ask me about any subject, topic, or lesson and I'll help you find what you need." }],
      },
    ],
  });

  const messages = chat.messages;
  const status = chat.status;
  const error = chat.error;
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    console.log('[chat] status:', status, 'messages:', messages.length, 'error:', error?.message);
  }, [status, messages.length, error]);

  useEffect(() => {
    if (error) {
      console.error("Chat error:", error.message, "cause:", (error as any)?.cause, "responseBody:", (error as any)?.responseBody);
    }
  }, [error]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    console.log('[send] sending:', text);
    try {
      const result = chat.sendMessage({ text });
      console.log('[send] message sent, awaiting response');
      await result;
      console.log('[send] response complete');
    } catch (e) {
      console.error("Send failed:", e);
    }
  };

  const handleSuggestion = async (suggestion: string) => {
    if (isLoading) return;
    try {
      await chat.sendMessage({ text: suggestion });
    } catch (e) {
      console.error("Suggestion failed:", e);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#020617' }}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        backgroundColor: '#0f172a',
      }}>
        <View style={{
          height: 44,
          width: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          marginRight: 12,
          overflow: 'hidden',
          backgroundColor: '#2563eb',
        }}>
          <Sparkles color="#fff" size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>AI Tutor</Text>
          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {user?.name ? `Hi ${user.name.split(' ')[0]}! ` : ''}Ask me anything about your studies
          </Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color="#22d3ee" />}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          if (m.role === 'system') return null;
          
          // Get text content from parts
          const textContent = m.parts?.filter(p => p.type === 'text').map(p => (p as any).text).join('') || '';
          const hasToolCalls = m.parts?.some(p => p.type === 'tool-invocation' || p.type === 'tool-call') ?? false;
          
          // Tool call in progress placeholder
          if (m.role === 'assistant' && !textContent && hasToolCalls) {
            return (
              <View key={m.id} style={{
                alignSelf: 'flex-start',
                backgroundColor: '#1e293b',
                borderRadius: 20,
                borderTopLeftRadius: 4,
                padding: 14,
                paddingHorizontal: 18,
                marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#22d3ee" />
                  <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 10 }}>
                    Consulting LMS database...
                  </Text>
                </View>
              </View>
            );
          }
          
          if (!textContent) return null;

          return (
            <View
              key={m.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                backgroundColor: isUser ? '#2563eb' : '#1e293b',
                borderRadius: 20,
                borderTopRightRadius: isUser ? 4 : 20,
                borderTopLeftRadius: isUser ? 20 : 4,
                padding: 14,
                paddingHorizontal: 18,
                marginBottom: 12,
                maxWidth: '82%',
                shadowColor: isUser ? '#2563eb' : '#000',
                shadowOpacity: isUser ? 0.3 : 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              {!isUser && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Sparkles color="#22d3ee" size={12} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#22d3ee', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    AI Tutor
                  </Text>
                </View>
              )}
              <Text style={{
                color: '#fff',
                fontSize: 15,
                lineHeight: 22,
              }}>{textContent}</Text>
            </View>
          );
        })}
        {error && (
          <View style={{
            alignSelf: 'center',
            backgroundColor: '#fef2f2',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#fca5a5'
          }}>
            <Text style={{ color: '#dc2626', fontSize: 13 }}>
              {error.message}
            </Text>
            {error.cause && (
              <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
                {(error.cause as any)?.message || String(error.cause)}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Suggestion chips (only show when few messages) */}
      {messages.length <= 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}
        >
          {[
            'Summarize my last lesson',
            'Give me study tips',
            'Explain a topic simply',
            'Help me prepare for a quiz',
          ].map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              onPress={() => handleSuggestion(suggestion)}
              disabled={isLoading}
              style={{
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: '#0f172a',
              }}
            >
              <Text style={{ fontSize: 13, color: '#94a3b8' }}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input Area */}
      <View style={{
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#334155',
            color: '#fff',
            borderRadius: 24,
            paddingHorizontal: 18,
            paddingVertical: Platform.OS === 'ios' ? 14 : 10,
            marginRight: 10,
            fontSize: 15,
          }}
          placeholder="What would you like to learn?"
          placeholderTextColor="#475569"
          value={inputText}
          onChangeText={setInputText}
          editable={!isLoading}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={isLoading || !inputText.trim()}
          style={{
            height: 48,
            width: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: inputText.trim() && !isLoading ? '#2563eb' : '#1e293b',
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send color={inputText.trim() ? '#fff' : '#475569'} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={{ backgroundColor: '#0f172a', paddingBottom: Platform.OS === 'ios' ? 8 : 4 }}>
        <Text style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>
          Powered by Afrinexel • Learning assistant
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

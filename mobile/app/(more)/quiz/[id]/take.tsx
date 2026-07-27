import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, SafeAreaView, Dimensions, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSubjectsContext } from "../../../../src/context/SubjectsContext";
import { useAuth } from "../../../../src/context/AuthContext";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle, X, LayoutGrid, Info } from "lucide-react-native";
import * as ScreenCapture from 'expo-screen-capture';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircularProgress } from "../../../../components/ui/circular-progress";

const { width } = Dimensions.get('window');

export default function TakeQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { quizzes, addSubmission, loading } = useSubjectsContext();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const quiz = useMemo(() => quizzes.find(q => q.id === id), [quizzes, id]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const [gridVisible, setGridVisible] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    totalPoints: number;
    percentage: number;
    correctCount: number;
    timeSpent: number;
  } | null>(null);

  const questions = useMemo(() => {
    if (!quiz?.questions) return [];
    
    let items = quiz.questions.map(q => {
      if (q.randomizeOrder && q.options) {
        let shuffledOptions = [...q.options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        return { ...q, options: shuffledOptions };
      }
      return q;
    });

    if (quiz.settings?.shuffleQuestions) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    }
    return items;
  }, [quiz]);

  useEffect(() => {
    if (quiz?.settings?.proctoring?.preventScreenshots) {
      ScreenCapture.preventScreenCaptureAsync();
    }
    return () => {
      if (quiz?.settings?.proctoring?.preventScreenshots) {
        ScreenCapture.allowScreenCaptureAsync();
      }
    };
  }, [quiz?.settings?.proctoring]);

  useEffect(() => {
    if (quiz && !isFinished && timeLeft === 0) {
      setTimeLeft(quiz.settings?.timeLimit ? quiz.settings.timeLimit * 60 : 3600);
    }
  }, [quiz, isFinished]);

  useEffect(() => {
    if (!quiz || isFinished || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, isFinished, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = (questions || [])[currentQuestionIndex];
  const totalQuestions = (questions || []).length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleAnswerSelect = (optionId: string | string[]) => {
    if (!currentQuestion) return;
    setSelectedAnswers(prev => {
      const currentAnswers = prev[currentQuestion.id] || [];
      if (currentQuestion.type === 'fill-in-the-blank') {
        return { ...prev, [currentQuestion.id]: Array.isArray(optionId) ? optionId : [optionId] };
      }
      if (currentQuestion.allowMultipleAnswers) {
        const singleId = Array.isArray(optionId) ? optionId[0] : optionId;
        if (currentAnswers.includes(singleId)) {
          return { ...prev, [currentQuestion.id]: currentAnswers.filter(id => id !== singleId) };
        } else {
          return { ...prev, [currentQuestion.id]: [...currentAnswers, singleId] };
        }
      } else {
        return { ...prev, [currentQuestion.id]: Array.isArray(optionId) ? optionId : [optionId] };
      }
    });
  };

  const handlePreSubmit = () => {
    if (!quiz) return;
    const unansweredCount = (questions || []).filter(q => {
      const ans = selectedAnswers[q.id];
      if (!ans || ans.length === 0) return true;
      if (q.type === 'fill-in-the-blank' && ans[0].trim() === "") return true;
      return false;
    }).length;

    if (unansweredCount > 0) {
      Alert.alert(
        "Unanswered Questions",
        `You have ${unansweredCount} unanswered ${unansweredCount === 1 ? 'question' : 'questions'}. Are you sure you want to submit?`,
        [
          { text: "Return", style: "cancel" },
          { text: "Submit", style: "default", onPress: () => handleSubmit() }
        ]
      );
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!quiz) return;
    setIsFinished(true);

    let score = 0;
    let correctCount = 0;

    (questions || []).forEach(q => {
      const userAnswers = selectedAnswers[q.id] || [];
      let isCorrect = false;

      if (q.type === 'fill-in-the-blank') {
        const userAnswer = userAnswers[0] || "";
        isCorrect = userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
      } else {
        const correctOptionIds = (q.options || []).filter(opt => opt.isCorrect).map(opt => opt.id);
        isCorrect = userAnswers.length === correctOptionIds.length &&
          userAnswers.every(id => correctOptionIds.includes(id));
      }

      if (isCorrect) {
        score += q.points;
        correctCount++;
      }
    });

    const totalPoints = (quiz.questions || []).reduce((acc, q) => acc + q.points, 0);
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const submission = {
      id: generateUUID(),
      quizId: quiz.id,
      studentId: user?.id || "anonymous",
      studentName: user?.name || "Student",
      score,
      totalPoints,
      accuracy: percentage, // using accuracy property to store percentage based on DB schema if needed
      timeSpent,
      completedAt: new Date().toISOString(),
      status: "completed" as const,
      answers: (questions || []).map(q => {
        const userAnswers = selectedAnswers[q.id] || [];
        let isCorrect = false;

        if (q.type === 'fill-in-the-blank') {
          const userAnswer = userAnswers[0] || "";
          isCorrect = userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
        } else {
          const correctIds = (q.options || []).filter(opt => opt.isCorrect).map(opt => opt.id);
          isCorrect = userAnswers.length === correctIds.length &&
            userAnswers.every(id => correctIds.includes(id));
        }

        return {
          questionId: q.id,
          answer: userAnswers,
          isCorrect,
          pointsEarned: isCorrect ? q.points : 0,
          timeSpent: 0
        };
      })
    };

    addSubmission(submission);
    setQuizResult({
      score,
      totalPoints,
      percentage,
      correctCount,
      timeSpent
    });
  };

  if (!quiz) return null;

  if (isFinished && quizResult) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40, alignItems: "center" }}>
          <View style={{ height: 80, width: 80, backgroundColor: "#ecfdf5", borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <CheckCircle2 color="#10b981" size={40} />
          </View>
          <Text style={{ fontSize: 32, fontWeight: "900", color: "#0f172a", marginBottom: 8 }}>Quiz Completed!</Text>
          <Text style={{ fontSize: 16, color: "#64748b", marginBottom: 32 }}>Here's how you performed in {quiz.title}</Text>

          <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
            <View style={{ width: (width - 64) / 2, backgroundColor: "#fff", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Score</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a" }}>{quizResult.score}/{quizResult.totalPoints}</Text>
            </View>
            <View style={{ width: (width - 64) / 2, backgroundColor: "#fff", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Percentage</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#10b981" }}>{quizResult.percentage}%</Text>
            </View>
            <View style={{ width: (width - 64) / 2, backgroundColor: "#fff", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Correct</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a" }}>{quizResult.correctCount}/{totalQuestions}</Text>
            </View>
            <View style={{ width: (width - 64) / 2, backgroundColor: "#fff", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#f1f5f9", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Time</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a" }}>{Math.floor(quizResult.timeSpent / 60)}m {quizResult.timeSpent % 60}s</Text>
            </View>
          </View>

          <View style={{ width: "100%", marginTop: 32, gap: 16 }}>
            <TouchableOpacity onPress={() => router.replace(`/quiz/${quiz.id}`)} style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" }}>
              <Text style={{ color: "#475569", fontWeight: "900" }}>Back to Details</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace("/quiz")} style={{ padding: 16, borderRadius: 16, backgroundColor: "#4f46e5", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "900" }}>All Quizzes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              "Exit Quiz?",
              "Exiting the quiz will result in an automatic submission. Are you sure you want to quit?",
              [
                { text: "Continue", style: "cancel" },
                { text: "Quit", style: "destructive", onPress: () => handleSubmit() }
              ]
            );
          }} 
          style={{ height: 40, width: 40, backgroundColor: "#f8fafc", borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        >
          <X color="#94a3b8" size={20} />
        </TouchableOpacity>
        
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <Clock color={timeLeft < 60 ? "#f43f5e" : "#f59e0b"} size={16} />
            <Text style={{ fontWeight: "900", color: timeLeft < 60 ? "#f43f5e" : "#334155" }}>{formatTime(timeLeft)}</Text>
          </View>
          <TouchableOpacity onPress={handlePreSubmit} style={{ backgroundColor: "#0f172a", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Progress Circular */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <CircularProgress 
            value={progress} 
            size={120} 
            strokeWidth={8} 
            color="#10b981"
          >
             <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a", textAlign: 'center' }}>{currentQuestionIndex + 1}/{totalQuestions}</Text>
             <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", textAlign: 'center' }}>Question</Text>
          </CircularProgress>
        </View>

        <Text style={{ fontSize: 12, fontWeight: "900", color: "#4f46e5", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a", marginBottom: 32 }}>
          {currentQuestion?.text}
        </Text>

        <View style={{ gap: 16 }}>
          {currentQuestion?.type === 'fill-in-the-blank' ? (
            <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: "#f8fafc", borderWidth: 2, borderColor: "#f1f5f9", borderRadius: 24, padding: 24 }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Your Answer Below</Text>
                <TextInput
                  value={selectedAnswers[currentQuestion.id]?.[0] || ""}
                  onChangeText={(text) => handleAnswerSelect([text])}
                  placeholder="Type your answer here..."
                  placeholderTextColor="#cbd5e1"
                  style={{ fontSize: 20, fontWeight: "700", color: "#0f172a", minHeight: 80 }}
                  multiline
                />
              </View>
              <View style={{ backgroundColor: "#fffbeb", padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AlertCircle color="#d97706" size={16} />
                <Text style={{ color: "#d97706", fontWeight: "700", fontSize: 12, flex: 1 }}>Spelling matters! Ensure your answer is typed correctly before proceeding.</Text>
              </View>
            </View>
          ) : (
            currentQuestion?.options.map((option, idx) => {
              const isSelected = selectedAnswers[currentQuestion.id]?.includes(option.id);
              const letter = String.fromCharCode(65 + idx);
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleAnswerSelect(option.id)}
                  style={{
                    padding: 20,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: isSelected ? "#10b981" : "#f1f5f9",
                    backgroundColor: isSelected ? "#ecfdf5" : "#fff",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16
                  }}
                >
                  <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: isSelected ? "#10b981" : "#f8fafc", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: isSelected ? "#fff" : "#94a3b8", fontWeight: "900", fontSize: 16 }}>{letter}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: isSelected ? "#0f172a" : "#475569" }}>{option.text}</Text>
                  {isSelected && <CheckCircle2 color="#10b981" size={20} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Footer Navigation */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: insets.bottom + 20, borderTopWidth: 1, borderTopColor: "#f1f5f9", gap: 12 }}>
        <TouchableOpacity 
          style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" }}
          onPress={() => setGridVisible(true)}
        >
          <LayoutGrid color="#64748b" size={24} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{ flex: 1, height: 56, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
          disabled={currentQuestionIndex === 0}
          onPress={() => setCurrentQuestionIndex(prev => prev - 1)}
        >
          <ChevronLeft color="#64748b" size={20} />
          <Text style={{ color: "#64748b", fontWeight: "900", fontSize: 14, textTransform: "uppercase" }}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: currentQuestionIndex === totalQuestions - 1 ? 0.5 : 1 }}
          disabled={currentQuestionIndex === totalQuestions - 1}
          onPress={() => setCurrentQuestionIndex(prev => prev + 1)}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14, textTransform: "uppercase" }}>Next</Text>
          <ChevronRight color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Questions Grid Modal */}
      <Modal visible={gridVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a" }}>Questions</Text>
              <TouchableOpacity onPress={() => setGridVisible(false)} style={{ height: 40, width: 40, backgroundColor: "#f8fafc", borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {questions.map((q, idx) => {
                  const isAnswered = (selectedAnswers[q.id]?.length || 0) > 0;
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      onPress={() => {
                        setCurrentQuestionIndex(idx);
                        setGridVisible(false);
                      }}
                      style={{
                        width: (width - 48 - 36) / 4,
                        aspectRatio: 1,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: isCurrent ? "#4f46e5" : (isAnswered ? "#10b981" : "#f1f5f9"),
                        backgroundColor: isCurrent ? "#eef2ff" : (isAnswered ? "#ecfdf5" : "#fff"),
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: "900", color: isCurrent ? "#4f46e5" : (isAnswered ? "#10b981" : "#64748b") }}>
                        {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

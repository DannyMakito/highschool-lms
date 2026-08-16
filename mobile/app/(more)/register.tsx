import React, { useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useRegistrationData } from "../../src/hooks/useRegistrationData";
import { useSubjectsContext } from "../../src/context/SubjectsContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";
import { ChevronLeft, BookOpen, Users, X, Hash } from "lucide-react-native";

interface Classmate {
  id: string;
  name: string;
  email: string;
  administrationNumber: string;
  gender: string;
  status: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { subjectClasses, studentSubjectClasses, loading } = useRegistrationData();
  const { subjects } = useSubjectsContext();
  const insets = useSafeAreaInsets();
  const [selectedClass, setSelectedClass] = useState<typeof subjectClasses[0] | null>(null);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [classmatesLoading, setClassmatesLoading] = useState(false);

  const myClasses = useMemo(() => {
    if (!user?.id) return [];
    const myIds = studentSubjectClasses
      .filter((ssc) => ssc.studentId === user.id)
      .map((ssc) => ssc.subjectClassId);

    return subjectClasses
      .filter((sc) => myIds.includes(sc.id))
      .map((sc) => {
        const subject = subjects.find((s) => s.id === sc.subjectId);
        return { ...sc, subjectName: subject?.name || "Unknown Subject" };
      });
  }, [user, studentSubjectClasses, subjectClasses, subjects]);

  const fetchClassmates = useCallback(async (subjectClassId: string) => {
    setClassmatesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-classmates", {
        body: { subject_class_id: subjectClassId },
      });

      if (error) throw error;
      setClassmates(data?.data || []);
    } catch (err) {
      console.error("Failed to fetch classmates:", err);
      setClassmates([]);
    } finally {
      setClassmatesLoading(false);
    }
  }, []);

  const openClass = (cls: typeof subjectClasses[0]) => {
    setSelectedClass(cls);
    fetchClassmates(cls.id);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
          <ChevronLeft color="#0f172a" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>My Classes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
        {myClasses.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", paddingTop: 80 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <BookOpen color="#cbd5e1" size={36} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#94a3b8" }}>No classes registered</Text>
            <Text style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>You have not been assigned to any classes yet.</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 16 }}>
              {myClasses.length} {myClasses.length === 1 ? "class" : "classes"} registered
            </Text>
            {myClasses.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                onPress={() => openClass(cls)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen color="#475569" size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>{cls.subjectName}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Hash color="#94a3b8" size={14} />
                      <Text style={{ fontSize: 13, color: "#64748b" }}>{cls.name}</Text>
                    </View>
                  </View>
                  <ChevronLeft color="#cbd5e1" size={18} style={{ transform: [{ rotate: "180deg" }] }} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedClass} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>{selectedClass?.subjectName}</Text>
                <Text style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{selectedClass?.name} • {classmates.length} {classmates.length === 1 ? "student" : "students"}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedClass(null)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
                <X color="#64748b" size={18} />
              </TouchableOpacity>
            </View>

            {classmatesLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <FlatList
                data={classmates}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item, index }) => (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: index < classmates.length - 1 ? 1 : 0, borderBottomColor: "#f8fafc" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                        {item.name ? item.name.charAt(0).toUpperCase() : "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>{item.name || "No name"}</Text>
                      {item.administrationNumber ? (
                        <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>#{item.administrationNumber}</Text>
                      ) : null}
                    </View>
                    {item.gender ? (
                      <View style={{ backgroundColor: "#f1f5f9", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748b" }}>{item.gender}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <Users color="#cbd5e1" size={32} />
                    <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>No students in this class</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
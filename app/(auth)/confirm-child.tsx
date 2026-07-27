import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { ParentAccessStudent } from "../../src/lib/parentAccess";
import { verifyParentAccessKey } from "../../src/lib/parentAccess";

export default function ConfirmChildScreen() {
  const params = useLocalSearchParams<{ accessKey?: string }>();
  const [student, setStudent] = useState<ParentAccessStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStudent = async () => {
      const result = await verifyParentAccessKey(params.accessKey || "");
      if (!mounted) return;

      if (!result.success) {
        setErrorMessage(result.message);
        setLoading(false);
        return;
      }

      setStudent(result.student);
      setLoading(false);
    };

    void loadStudent();

    return () => {
      mounted = false;
    };
  }, [params.accessKey]);

  const confirmChild = () => {
    router.push({
      pathname: "/create-account",
      params: { accessKey: params.accessKey || "" },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Confirm Learner</Text>
        <Text style={styles.title}>Is this your child?</Text>

        {loading ? <ActivityIndicator size="large" color="#1d4ed8" /> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {student ? (
          <View style={styles.studentCard}>
            <Text style={styles.name}>{student.fullName}</Text>
            <Text style={styles.detail}>{student.gradeLabel || "Grade not set"}</Text>
            <Text style={styles.detail}>{student.classLabel || "Class not set"}</Text>
            {student.administrationNumber ? (
              <Text style={styles.detail}>Learner no. {student.administrationNumber}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/login")}>
            <Text style={styles.secondaryButtonText}>No</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={confirmChild} disabled={!student}>
            <Text style={styles.buttonText}>Yes</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
  },
  studentCard: {
    backgroundColor: "#eef6ff",
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  name: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  detail: {
    color: "#475569",
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    opacity: 1,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
  },
});

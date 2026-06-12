import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ParentAccessStudent } from "../../src/lib/parentAccess";
import { registerParentWithAccessKey, verifyParentAccessKey } from "../../src/lib/parentAccess";

export default function CreateAccountScreen() {
  const params = useLocalSearchParams<{ accessKey?: string }>();
  const [student, setStudent] = useState<ParentAccessStudent | null>(null);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [cellphone, setCellphone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStudent = async () => {
      const result = await verifyParentAccessKey(params.accessKey || "");
      if (!mounted) return;
      if (result.success) setStudent(result.student);
    };

    void loadStudent();

    return () => {
      mounted = false;
    };
  }, [params.accessKey]);

  const createAccount = async () => {
    setLoading(true);
    setErrorMessage(null);

    const result = await registerParentWithAccessKey({
      accessKey: params.accessKey || "",
      firstName,
      surname,
      cellphone,
      email,
      password,
    });
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    router.replace(result.needsConfirmation ? "/sign-in" : "/home");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Create Parent Profile</Text>
          <Text style={styles.title}>Almost there</Text>
          {student ? <Text style={styles.subtitle}>You are connecting to {student.fullName}.</Text> : null}

          <TextInput placeholder="Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
          <TextInput placeholder="Surname" value={surname} onChangeText={setSurname} style={styles.input} />
          <TextInput
            placeholder="Cellphone number"
            keyboardType="phone-pad"
            value={cellphone}
            onChangeText={setCellphone}
            style={styles.input}
          />
          <TextInput
            placeholder="Email address (optional)"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Password or PIN"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={createAccount}
            style={styles.input}
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Pressable style={styles.button} onPress={createAccount} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    gap: 13,
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
  subtitle: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f8fafc",
  },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
  },
});

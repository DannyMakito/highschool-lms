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
import { AfrinexelBrand } from "../../src/components/AfrinexelBrand";
import type { ParentAccessStudent } from "../../src/lib/parentAccess";
import { registerParentWithAccessKey, verifyParentAccessKey } from "../../src/lib/parentAccess";
import { authTextInputProps, brandColors } from "../../src/theme/brand";

export default function CreateAccountScreen() {
  const params = useLocalSearchParams<{ accessKey?: string }>();
  const [student, setStudent] = useState<ParentAccessStudent | null>(null);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [cellphone, setCellphone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          <AfrinexelBrand caption="Create Parent Profile" />
          <Text style={styles.title}>Almost there</Text>
          {student ? <Text style={styles.subtitle}>You are connecting to {student.fullName}.</Text> : null}

          <TextInput {...authTextInputProps} placeholder="Name" value={firstName} onChangeText={setFirstName} style={styles.input} />
          <TextInput {...authTextInputProps} placeholder="Surname" value={surname} onChangeText={setSurname} style={styles.input} />
          <TextInput
            {...authTextInputProps}
            placeholder="Cellphone number"
            keyboardType="phone-pad"
            value={cellphone}
            onChangeText={setCellphone}
            style={styles.input}
          />
          <TextInput
            {...authTextInputProps}
            placeholder="Email address (optional)"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <View style={styles.passwordRow}>
            <TextInput
              {...authTextInputProps}
              placeholder="Password or PIN"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={createAccount}
              style={[styles.input, styles.passwordInput]}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.passwordToggle}>
              <Text style={styles.passwordToggleText}>{showPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>

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
    backgroundColor: brandColors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: brandColors.card,
    borderRadius: 24,
    padding: 20,
    gap: 13,
  },
  title: {
    color: brandColors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: brandColors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: brandColors.border,
    borderRadius: 16,
    color: brandColors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: brandColors.field,
    flex: 1,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  passwordInput: {
    flex: 1,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordToggleText: {
    color: brandColors.primary,
    fontWeight: "800",
  },
  button: {
    backgroundColor: brandColors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  buttonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: brandColors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: brandColors.card,
    borderRadius: 24,
    padding: 20,
    gap: 13,
  },
  title: {
    color: brandColors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: brandColors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: brandColors.border,
    borderRadius: 16,
    color: brandColors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: brandColors.field,
  },
  button: {
    backgroundColor: brandColors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  buttonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: brandColors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});

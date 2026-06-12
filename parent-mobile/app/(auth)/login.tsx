import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { normalizeAccessKey, verifyParentAccessKey } from "../../src/lib/parentAccess";

export default function LoginScreen() {
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAccessKey = async () => {
    setLoading(true);
    setErrorMessage(null);

    const result = await verifyParentAccessKey(accessKey);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    router.push({
      pathname: "/confirm-child",
      params: { accessKey: normalizeAccessKey(accessKey) },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Parent Portal</Text>
        <Text style={styles.title}>Enter your parent access key</Text>
        <Text style={styles.subtitle}>Use the key shared by the school to connect to your learner.</Text>

        <TextInput
          placeholder="Access key"
          autoCapitalize="characters"
          value={accessKey}
          onChangeText={setAccessKey}
          returnKeyType="done"
          onSubmitEditing={handleAccessKey}
          style={styles.input}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable style={styles.button} onPress={handleAccessKey} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </Pressable>

        <Link href="/sign-in" style={styles.link}>
          I already have a parent account
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
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
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    color: "#1d4ed8",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
  },
});

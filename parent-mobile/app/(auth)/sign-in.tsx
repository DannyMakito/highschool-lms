import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";

export default function SignInScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    const result = await login(email.trim(), pin.trim());
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || "Unable to sign in");
      return;
    }

    router.replace("/home");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Parent Portal</Text>
        <Text style={styles.title}>Sign in to your dashboard</Text>
        <Text style={styles.subtitle}>Use the email or phone account you created.</Text>

        <TextInput
          placeholder="Email address"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Password or PIN"
          secureTextEntry
          value={pin}
          onChangeText={setPin}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          style={styles.input}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>

        <Link href="/forgot-pin" style={styles.link}>
          Forgot PIN?
        </Link>
        <Link href="/login" style={styles.secondaryLink}>
          Use a new access key
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
    borderRadius: 24,
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
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  secondaryLink: {
    color: "#475569",
    fontWeight: "600",
    textAlign: "center",
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
  },
});

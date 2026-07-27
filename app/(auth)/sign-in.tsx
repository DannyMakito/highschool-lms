import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AfrinexelBrand } from "../../src/components/AfrinexelBrand";
import { useAuth } from "../../src/context/AuthContext";
import { authTextInputProps, brandColors } from "../../src/theme/brand";

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
        <AfrinexelBrand />
        <Text style={styles.title}>Sign in to your dashboard</Text>
        <Text style={styles.subtitle}>Use the email or phone account you created.</Text>

        <TextInput
          {...authTextInputProps}
          placeholder="Email address"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          {...authTextInputProps}
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
    backgroundColor: brandColors.background,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: brandColors.card,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: brandColors.text,
  },
  subtitle: {
    color: brandColors.muted,
    fontSize: 14,
    lineHeight: 20,
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
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    color: brandColors.primary,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  secondaryLink: {
    color: brandColors.muted,
    fontWeight: "600",
    textAlign: "center",
  },
  error: {
    color: brandColors.danger,
    fontSize: 13,
  },
});

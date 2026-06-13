import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AfrinexelBrand } from "../../src/components/AfrinexelBrand";
import { normalizeAccessKey, verifyParentAccessKey } from "../../src/lib/parentAccess";
import { authTextInputProps, brandColors } from "../../src/theme/brand";

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
        <AfrinexelBrand />
        <Text style={styles.title}>Enter your parent access key</Text>
        <Text style={styles.subtitle}>Use the key shared by the school to connect to your learner.</Text>

        <TextInput
          {...authTextInputProps}
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
    backgroundColor: brandColors.background,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: brandColors.card,
    borderRadius: 28,
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
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  error: {
    color: brandColors.danger,
    fontSize: 13,
  },
});

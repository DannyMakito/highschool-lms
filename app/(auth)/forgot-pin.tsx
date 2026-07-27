import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function ForgotPinScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Forgot PIN</Text>
        <Text style={styles.body}>
          This screen is scaffolded for now. We can connect recovery or support flows once the school decides how parents should reset access.
        </Text>
        <Link href="/sign-in" style={styles.link}>
          Back to sign in
        </Link>
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
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  body: {
    color: "#475569",
    lineHeight: 20,
  },
  link: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
});

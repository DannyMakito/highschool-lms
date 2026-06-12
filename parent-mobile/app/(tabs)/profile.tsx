import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { SectionCard } from "../../src/components/SectionCard";

export default function ProfileScreen() {
  const { parent, logout } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Parent account details and future settings live here.</Text>

      <SectionCard title="Account">
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{parent?.fullName || "Parent"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{parent?.email || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{parent?.role || "parent"}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Next steps">
        <Text style={styles.body}>
          We can add PIN reset, profile editing, and notification preferences after the first child dashboard is working.
        </Text>
      </SectionCard>

      <Text style={styles.logout} onPress={() => void logout()}>
        Sign out
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    marginTop: 6,
    marginBottom: 16,
  },
  row: {
    gap: 4,
    marginBottom: 12,
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  value: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    color: "#334155",
    lineHeight: 20,
  },
  logout: {
    color: "#b91c1c",
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
});

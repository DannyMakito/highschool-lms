import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { ChildSummaryCard } from "../../src/components/ChildSummaryCard";
import { SectionCard } from "../../src/components/SectionCard";

export default function ProfileScreen() {
  const { parent, children, activeChild, logout } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Your account, linked learners, and shortcuts live here.</Text>

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

      <SectionCard title="Active learner" subtitle={activeChild ? "The currently selected learner on this device." : "No learner selected yet."}>
        {activeChild ? <ChildSummaryCard child={activeChild} /> : <Text style={styles.body}>Link a learner to see their dashboard here.</Text>}
      </SectionCard>

      <SectionCard title="Linked learners" subtitle="Tap a learner to open their dashboard.">
        {children.length === 0 ? (
          <Text style={styles.empty}>No learners are linked to this parent account yet.</Text>
        ) : (
          <View style={styles.stack}>
            {children.map((child) => (
              <ChildSummaryCard key={child.id} child={child} />
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Quick actions" subtitle="Common actions should feel like buttons, not plain text.">
        <View style={styles.actions}>
          <Link href="/messages" asChild>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Open chat</Text>
            </Pressable>
          </Link>
          <Link href="/notifications" asChild>
            <Pressable style={styles.actionButtonSecondary}>
              <Text style={styles.actionButtonSecondaryText}>View alerts</Text>
            </Pressable>
          </Link>
          <Pressable style={styles.logoutButton} onPress={() => void logout()}>
            <Text style={styles.logoutButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </SectionCard>
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
  empty: {
    color: "#64748b",
  },
  stack: {
    gap: 12,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  actionButtonSecondary: {
    backgroundColor: "#dbeafe",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonSecondaryText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  logoutButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  logoutButtonText: {
    color: "#b91c1c",
    fontWeight: "800",
  },
});

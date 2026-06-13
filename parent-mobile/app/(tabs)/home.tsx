import { Link } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { AfrinexelBrand } from "../../src/components/AfrinexelBrand";
import { ChildSummaryCard } from "../../src/components/ChildSummaryCard";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";
import { brandColors } from "../../src/theme/brand";

export default function HomeScreen() {
  const { parent, children, activeChild } = useAuth();
  const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AfrinexelBrand compact />
      <Text style={styles.title}>Welcome{parent ? `, ${parent.fullName.split(" ")[0]}` : ""}</Text>
      <Text style={styles.subtitle}>Quick view of each linked child.</Text>

      <SectionCard title="Active child" subtitle="Use the child cards or tap the highlighted child below.">
        {activeChild ? <ChildSummaryCard child={activeChild} /> : <Text style={styles.empty}>No linked children yet.</Text>}
      </SectionCard>

      <SectionCard title="Live summary" subtitle="Pulled from Supabase for the selected child.">
        {loading ? (
          <ActivityIndicator color={brandColors.primary} />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : (
          <View style={styles.metrics}>
            <Text style={styles.metric}>Assignments: {data.assignments.length}</Text>
            <Text style={styles.metric}>Grades: {data.grades.length}</Text>
            <Text style={styles.metric}>Attendance records: {data.attendance.length}</Text>
            <Text style={styles.metric}>Announcements: {data.announcements.length}</Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title="Linked children" subtitle="Tap a child to open their detail view.">
        {children.length === 0 ? (
          <Text style={styles.empty}>No child links have been added yet.</Text>
        ) : (
          <View style={styles.stack}>
            {children.map((child) => (
              <ChildSummaryCard key={child.id} child={child} />
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Next phase" subtitle="This scaffold keeps the portal read-only for now.">
        <Text style={styles.body}>
          We’ll connect grades, attendance, assignments, and announcements after the core auth and child-link flow is confirmed.
        </Text>
        <Link href="/children" style={styles.link}>
          Browse children
        </Link>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: brandColors.field,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: brandColors.text,
  },
  subtitle: {
    color: brandColors.muted,
    fontSize: 14,
    marginBottom: 16,
    marginTop: 6,
  },
  empty: {
    color: brandColors.placeholder,
  },
  stack: {
    gap: 12,
  },
  metrics: {
    gap: 8,
  },
  metric: {
    color: brandColors.text,
    fontWeight: "600",
  },
  body: {
    color: "#334155",
    marginBottom: 10,
    lineHeight: 20,
  },
  link: {
    color: brandColors.primary,
    fontWeight: "700",
  },
  error: {
    color: brandColors.danger,
  },
});

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { ChildSummaryCard } from "../../src/components/ChildSummaryCard";
import { SectionCard } from "../../src/components/SectionCard";

export default function ChildrenScreen() {
  const { children } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Children</Text>
      <Text style={styles.subtitle}>Each card opens a child-specific view.</Text>

      <SectionCard title="Linked children">
        {children.length === 0 ? (
          <Text style={styles.empty}>No children are linked to this parent account yet.</Text>
        ) : (
          <View style={styles.stack}>
            {children.map((child) => (
              <ChildSummaryCard key={child.id} child={child} />
            ))}
          </View>
        )}
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
  empty: {
    color: "#64748b",
  },
  stack: {
    gap: 12,
  },
});

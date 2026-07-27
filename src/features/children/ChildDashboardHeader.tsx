import { StyleSheet, Text, View } from "react-native";
import type { ChildSummary } from "../../types";

export function ChildDashboardHeader({ child }: { child: ChildSummary | null }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{child?.fullName || "Child"}</Text>
      <Text style={styles.subtitle}>
        {child?.gradeLabel || "Grade pending"} {child?.classLabel ? `• ${child.classLabel}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
    marginTop: 6,
  },
});

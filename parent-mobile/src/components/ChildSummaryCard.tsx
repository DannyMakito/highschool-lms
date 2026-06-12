import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChildSummary } from "../types";

type ChildSummaryCardProps = {
  child: ChildSummary;
};

export function ChildSummaryCard({ child }: ChildSummaryCardProps) {
  return (
    <Link href={`/child/${child.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{child.fullName.charAt(0)}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.name}>{child.fullName}</Text>
            <Text style={styles.meta}>
              {child.gradeLabel || "Grade pending"} {child.classLabel ? `• ${child.classLabel}` : ""}
            </Text>
            <Text style={styles.meta}>{child.administrationNumber || "No admin number yet"}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  meta: {
    color: "#cbd5e1",
    fontSize: 12,
  },
});

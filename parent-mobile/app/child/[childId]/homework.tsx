import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../../src/components/SectionCard";
import { getChildById } from "../../../src/lib/auth";
import { useAuth } from "../../../src/context/AuthContext";
import { useChildDashboard } from "../../../src/features/children/useChildDashboard";

export default function ChildHomeworkScreen() {
  const params = useLocalSearchParams<{ childId: string }>();
  const { children } = useAuth();
  const child = getChildById(children, params.childId);
  const { data, loading, errorMessage } = useChildDashboard(child?.id);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Homework</Text>
    <Text style={styles.subtitle}>{child?.fullName || "Child"}’s paper-based homework from their teachers.</Text>
    <SectionCard title="Upcoming homework" subtitle="Please encourage your child to complete this work before its due date.">
      {loading ? <Text style={styles.body}>Loading homework...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {data.homework.length === 0 ? <Text style={styles.body}>No homework has been posted yet.</Text> : <View style={styles.stack}>{data.homework.map((item) => <View key={item.id} style={styles.card}>
        <Text style={styles.metric}>{item.title}</Text><Text style={styles.due}>Due {item.dueDate}</Text><Text style={styles.body}>{item.instructions}</Text>
        {item.textbookReference ? <Text style={styles.reference}>Textbook / workbook: {item.textbookReference}</Text> : null}
      </View>)}</View>}
    </SectionCard>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" }, content: { padding: 16 }, title: { fontSize: 28, fontWeight: "800", color: "#0f172a" }, subtitle: { color: "#475569", marginTop: 6, marginBottom: 16 },
  stack: { gap: 12 }, card: { backgroundColor: "#f8fafc", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" }, body: { color: "#334155", lineHeight: 20 }, metric: { color: "#0f172a", fontWeight: "700", marginBottom: 5 }, due: { color: "#1d4ed8", fontSize: 12, fontWeight: "700", marginBottom: 10 }, reference: { color: "#475569", marginTop: 10, fontSize: 12 }, error: { color: "#b91c1c" },
});

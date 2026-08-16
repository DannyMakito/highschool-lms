import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";
import { brandColors } from "../../src/theme/brand";

function formatUpdated(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "Recently";
}

export default function MessagesScreen() {
  const router = useRouter();
  const { activeChild } = useAuth();
  const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Messages</Text>
    <Text style={styles.subtitle}>{activeChild ? `Choose a teacher to message about ${activeChild.fullName}.` : "Choose a linked learner to see their teachers."}</Text>

    <SectionCard title="Teacher inbox" subtitle="Open an existing conversation or start a new one.">
      {loading ? <Text style={styles.body}>Loading teacher conversations…</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!loading && activeChild && data.subjectTeachers.length === 0 ? <Text style={styles.body}>No subject teachers are available for this learner yet.</Text> : null}
      <View style={styles.stack}>
        {data.subjectTeachers.map((recipient) => <Pressable
          key={recipient.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => recipient.discussionId
            ? router.push({ pathname: "/chat/[discussionId]", params: { discussionId: recipient.discussionId } })
            : router.push({ pathname: "/chat/new", params: { subjectClassId: recipient.subjectClassId, subjectId: recipient.subjectId || "", teacherName: recipient.teacherName || "Teacher", subjectName: recipient.subjectName || "Subject" } })}
        >
          <View style={styles.avatar}><Text style={styles.avatarText}>{(recipient.teacherName || "T").charAt(0).toUpperCase()}</Text></View>
          <View style={styles.cardContent}>
            <Text style={styles.recipient}>{recipient.teacherName || "Subject teacher"}</Text>
            <Text style={styles.subject}>{recipient.subjectName || "Subject"}</Text>
            <Text numberOfLines={1} style={styles.preview}>{recipient.preview || "Start a conversation about this learner."}</Text>
          </View>
          <View style={styles.cardEnd}><Text style={styles.date}>{formatUpdated(recipient.updatedAt)}</Text><Text style={styles.open}>{recipient.discussionId ? "Open" : "Write"}</Text></View>
        </Pressable>)}
      </View>
    </SectionCard>

    <SectionCard title="A private school conversation" subtitle="Messages stay linked to the relevant learner and subject so the right teacher has the context.">
      <Text style={styles.body}>Use messages for questions about learning, homework, attendance, or classroom updates. For an absence, use the Report an absence form from the child dashboard.</Text>
    </SectionCard>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brandColors.field }, content: { padding: 16, paddingBottom: 32 }, title: { color: brandColors.text, fontSize: 28, fontWeight: "800" }, subtitle: { color: brandColors.muted, marginTop: 6, marginBottom: 16, lineHeight: 20 }, stack: { gap: 10 }, card: { alignItems: "center", backgroundColor: "#fff", borderColor: "#e2e8f0", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 }, cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] }, avatar: { alignItems: "center", backgroundColor: brandColors.primarySoft, borderRadius: 18, height: 42, justifyContent: "center", width: 42 }, avatarText: { color: brandColors.primary, fontWeight: "800", fontSize: 17 }, cardContent: { flex: 1 }, recipient: { color: brandColors.text, fontWeight: "800" }, subject: { color: brandColors.primary, fontSize: 12, fontWeight: "700", marginTop: 2 }, preview: { color: "#475569", fontSize: 13, marginTop: 4 }, cardEnd: { alignItems: "flex-end" }, date: { color: "#64748b", fontSize: 11 }, open: { color: brandColors.primary, fontSize: 12, fontWeight: "800", marginTop: 7 }, body: { color: "#334155", lineHeight: 20 }, error: { color: brandColors.danger, marginBottom: 8 },
});

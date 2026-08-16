import { Link } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AfrinexelBrand } from "../../src/components/AfrinexelBrand";
import { ChildSummaryCard } from "../../src/components/ChildSummaryCard";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";
import { brandColors } from "../../src/theme/brand";

function formatDate(value?: string | null) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function HomeScreen() {
  const { parent, children, activeChild } = useAuth();
  const { data, loading, errorMessage } = useChildDashboard(activeChild?.id, parent?.id);
  const progress = data.progress;
  const progressLabel = progress.averageScore === null
    ? "Building a picture"
    : progress.averageScore >= 70 ? "On track" : progress.averageScore >= 50 ? "Needs attention" : "Needs support";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AfrinexelBrand compact />
      <Text style={styles.title}>Welcome{parent?.fullName ? `, ${parent.fullName.split(" ")[0]}` : ""}</Text>
      <Text style={styles.subtitle}>A clear view of what matters for your child right now.</Text>

      <SectionCard title="Active child" subtitle="Choose a learner to view their school progress.">
        {activeChild ? <ChildSummaryCard child={activeChild} /> : <Text style={styles.empty}>No linked children yet. Ask your school for a parent access key.</Text>}
      </SectionCard>

      {activeChild ? (
        <>
          <SectionCard title="Progress snapshot" subtitle={`${activeChild.fullName}'s latest available school information.`}>
            {loading ? <ActivityIndicator color={brandColors.primary} /> : errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : (
              <View style={styles.snapshot}>
                <View style={styles.snapshotLead}>
                  <Text style={styles.statusLabel}>{progressLabel}</Text>
                  <Text style={styles.statusCopy}>
                    {progress.averageScore === null
                      ? "Marks will appear here once teachers release assessment results."
                      : `Average of ${progress.scoreCount} recent marked item${progress.scoreCount === 1 ? "" : "s"}: ${progress.averageScore.toFixed(1)}`}
                  </Text>
                </View>
                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{progress.attendanceRate === null ? "—" : `${Math.round(progress.attendanceRate)}%`}</Text>
                    <Text style={styles.metricLabel}>Attendance</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{progress.overdueCount}</Text>
                    <Text style={styles.metricLabel}>Overdue work</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{progress.dueSoonCount}</Text>
                    <Text style={styles.metricLabel}>Due this week</Text>
                  </View>
                </View>
              </View>
            )}
          </SectionCard>

          <SectionCard title="Needs your attention" subtitle="Important school updates and next steps.">
            {loading ? <Text style={styles.body}>Checking for updates…</Text> : null}
            {!loading && progress.overdueCount > 0 ? <Text style={styles.priority}>• {progress.overdueCount} assignment{progress.overdueCount === 1 ? " is" : "s are"} overdue.</Text> : null}
            {!loading && progress.absenceCount > 0 ? <Text style={styles.priority}>• {progress.absenceCount} recorded absence{progress.absenceCount === 1 ? "" : "s"} in the latest attendance records.</Text> : null}
            {!loading && progress.lateCount > 0 ? <Text style={styles.priority}>• {progress.lateCount} late arrival{progress.lateCount === 1 ? "" : "s"} recorded recently.</Text> : null}
            {!loading && data.alerts.slice(0, 2).map((alert) => <View key={alert.id} style={styles.alertRow}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.body}>{alert.description}</Text>
            </View>)}
            {!loading && progress.overdueCount === 0 && progress.absenceCount === 0 && progress.lateCount === 0 && data.alerts.length === 0 ? <Text style={styles.body}>Nothing urgent right now. We will show important child-related updates here.</Text> : null}
            <Link href="/notifications" style={styles.link}>View all alerts</Link>
          </SectionCard>

          <SectionCard title="Upcoming work" subtitle="Help your child prepare for the week ahead.">
            {data.homework.filter((item) => new Date(item.dueDate) >= new Date()).slice(0, 3).map((item) => <View key={item.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{item.title || "Homework task"}</Text>
              <Text style={styles.listMeta}>Due {formatDate(item.dueDate)}</Text>
            </View>)}
            {data.assignments.filter((item) => item.dueDate && new Date(item.dueDate) >= new Date()).slice(0, 3).map((item) => <View key={item.id} style={styles.listRow}>
              <Text style={styles.listTitle}>{item.title || "Assignment"}</Text>
              <Text style={styles.listMeta}>Due {formatDate(item.dueDate)}</Text>
            </View>)}
            {!loading && data.homework.length === 0 && data.assignments.length === 0 ? <Text style={styles.body}>No upcoming work has been shared yet.</Text> : null}
            <Link href={`/child/${activeChild.id}/assignments`} style={styles.link}>View assignments</Link>
          </SectionCard>

          <SectionCard title="Quick actions" subtitle="Keep the school informed and stay connected.">
            <View style={styles.actions}>
              <Link href={`/child/${activeChild.id}/absence-report`} asChild><Pressable style={styles.actionButton}><Text style={styles.actionButtonText}>Report an absence</Text></Pressable></Link>
              <Link href={`/child/${activeChild.id}/grades`} asChild><Pressable style={styles.actionButtonSecondary}><Text style={styles.actionButtonSecondaryText}>View grades</Text></Pressable></Link>
              <Link href="/messages" asChild><Pressable style={styles.actionButtonSecondary}><Text style={styles.actionButtonSecondaryText}>Message school</Text></Pressable></Link>
            </View>
          </SectionCard>
        </>
      ) : null}

      {children.length > 1 ? <SectionCard title="Linked children" subtitle="Tap a learner to make them active."><View style={styles.stack}>{children.map((child) => <ChildSummaryCard key={child.id} child={child} />)}</View></SectionCard> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brandColors.field }, content: { padding: 16, paddingBottom: 32 }, title: { fontSize: 30, fontWeight: "800", color: brandColors.text }, subtitle: { color: brandColors.muted, fontSize: 14, marginBottom: 16, marginTop: 6 }, empty: { color: brandColors.placeholder }, body: { color: "#334155", lineHeight: 20 }, error: { color: brandColors.danger }, snapshot: { gap: 14 }, snapshotLead: { backgroundColor: brandColors.primarySoft, padding: 14, borderRadius: 16 }, statusLabel: { color: brandColors.primary, fontWeight: "800", fontSize: 17 }, statusCopy: { color: "#334155", lineHeight: 20, marginTop: 4 }, metricGrid: { flexDirection: "row", gap: 8 }, metricCard: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" }, metricValue: { color: brandColors.text, fontWeight: "800", fontSize: 20 }, metricLabel: { color: brandColors.muted, fontSize: 11, marginTop: 3 }, priority: { color: "#7c2d12", lineHeight: 21, marginBottom: 6 }, alertRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e2e8f0", paddingTop: 10, marginTop: 6 }, alertTitle: { color: brandColors.text, fontWeight: "800", marginBottom: 3 }, listRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0", paddingVertical: 10 }, listTitle: { color: brandColors.text, fontWeight: "700" }, listMeta: { color: brandColors.primary, fontSize: 12, fontWeight: "700", marginTop: 3 }, link: { color: brandColors.primary, fontWeight: "800", marginTop: 12 }, stack: { gap: 12 }, actions: { gap: 10 }, actionButton: { backgroundColor: brandColors.primary, borderRadius: 16, paddingVertical: 14, alignItems: "center" }, actionButtonText: { color: "#ffffff", fontWeight: "800" }, actionButtonSecondary: { backgroundColor: brandColors.primarySoft, borderRadius: 16, paddingVertical: 14, alignItems: "center" }, actionButtonSecondaryText: { color: brandColors.primary, fontWeight: "800" },
});

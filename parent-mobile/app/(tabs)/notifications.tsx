import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { brandColors } from "../../src/theme/brand";

type Alert = {
  id: string;
  category: string;
  title: string;
  description: string;
  subject_name?: string | null;
  created_at: string;
  read_at?: string | null;
};

function formatDate(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Recently";
}

export default function NotificationsScreen() {
  const { parent } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const loadAlerts = useCallback(async () => {
    if (!parent?.id) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_notifications")
      .select("id, category, title, description, subject_name, created_at, read_at")
      .eq("recipient_id", parent.id)
      .is("read_at", null)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      // The app remains usable while an older school database is upgraded.
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    setAlerts((data || []) as Alert[]);
  }, [parent?.id]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const markRead = async (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    const { error } = await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) void loadAlerts();
  };

  const markAllRead = async () => {
    const ids = alerts.map((alert) => alert.id);
    setAlerts([]);
    if (ids.length) {
      const { error } = await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
      if (error) void loadAlerts();
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.subtitle}>Important updates about your linked learners, kept here until you have read them.</Text>

      <SectionCard title={`Unread updates${alerts.length ? ` (${alerts.length})` : ""}`}>
        {alerts.length ? (
          <Pressable style={styles.markAll} onPress={() => void markAllRead()}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        ) : null}
        {loading ? <Text style={styles.body}>Loading alerts...</Text> : null}
        {unavailable ? <Text style={styles.body}>Alerts will be available after the school notification update is installed.</Text> : null}
        {!loading && !unavailable && alerts.length === 0 ? <Text style={styles.body}>You are all caught up.</Text> : null}
        <View style={styles.stack}>
          {alerts.map((alert) => (
            <Pressable key={alert.id} style={styles.card} onPress={() => void markRead(alert.id)}>
              <Text style={styles.metric}>{alert.category || "Update"}</Text>
              <Text style={styles.alertTitle}>{alert.title || "New update for your child"}</Text>
              <Text style={styles.body}>{alert.description || "Open the school portal for more information."}</Text>
              {alert.subject_name ? <Text style={styles.subject}>{alert.subject_name}</Text> : null}
              <Text style={styles.date}>{formatDate(alert.created_at)}</Text>
              <Text style={styles.readHint}>Tap to mark as read</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brandColors.field },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: "800", color: brandColors.text },
  subtitle: { color: brandColors.muted, marginTop: 6, marginBottom: 16 },
  stack: { gap: 12 },
  card: { backgroundColor: "#f8fafc", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  metric: { color: brandColors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  alertTitle: { color: brandColors.text, fontWeight: "800", marginBottom: 4 },
  body: { color: "#334155", lineHeight: 20 },
  subject: { color: brandColors.muted, fontSize: 12, fontWeight: "700", marginTop: 8 },
  date: { color: brandColors.muted, fontSize: 12, marginTop: 8 },
  readHint: { color: brandColors.primary, fontSize: 12, fontWeight: "700", marginTop: 10 },
  markAll: { alignSelf: "flex-start", backgroundColor: brandColors.primarySoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  markAllText: { color: brandColors.primary, fontWeight: "800" },
});

import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SectionCard } from "../../../src/components/SectionCard";
import { useAuth } from "../../../src/context/AuthContext";
import { getChildById } from "../../../src/lib/auth";
import { supabase } from "../../../src/lib/supabase";
import { brandColors } from "../../../src/theme/brand";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AbsenceReportScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { parent, children } = useAuth();
  const child = getChildById(children, childId);
  const router = useRouter();
  const [absenceDate, setAbsenceDate] = useState(today());
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const normalizedReason = reason.trim();
    if (!parent?.id || !child?.id) return setErrorMessage("We could not confirm the linked parent and learner details.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(absenceDate)) return setErrorMessage("Use the date format YYYY-MM-DD.");
    if (normalizedReason.length < 3) return setErrorMessage("Please provide a short reason for the absence.");
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await supabase.from("parent_absence_reports").insert({
      parent_id: parent.id,
      student_id: child.id,
      absence_date: absenceDate,
      reason: normalizedReason,
    });
    setSubmitting(false);
    if (error) {
      setErrorMessage(error.code === "23505" ? "An absence report for this child and date has already been sent." : error.message || "We could not send the absence report. Please try again.");
      return;
    }
    setSuccessMessage("Your absence report has been sent to the school. A confirmation is now in Alerts.");
    setReason("");
  };

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Report an absence</Text>
    <Text style={styles.subtitle}>Let the school know if {child?.fullName || "your child"} will be absent.</Text>
    <SectionCard title="Absence details" subtitle="This is an absence notice, not a medical certificate submission.">
      <Text style={styles.label}>Date of absence</Text>
      <TextInput value={absenceDate} onChangeText={setAbsenceDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.input} />
      <Text style={styles.label}>Reason</Text>
      <TextInput value={reason} onChangeText={setReason} placeholder="For example: medical appointment" multiline textAlignVertical="top" style={[styles.input, styles.reason]} />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <View style={styles.success}><Text style={styles.successText}>{successMessage}</Text></View> : null}
      <Pressable onPress={() => void submit()} disabled={submitting || Boolean(successMessage)} style={[styles.submit, (submitting || successMessage) && styles.submitDisabled]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{successMessage ? "Report sent" : "Send absence report"}</Text>}
      </Pressable>
      {successMessage ? <Pressable onPress={() => router.replace("/notifications")} style={styles.secondary}><Text style={styles.secondaryText}>Open alerts</Text></Pressable> : null}
    </SectionCard>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brandColors.field }, content: { padding: 16, paddingBottom: 32 }, title: { color: brandColors.text, fontSize: 28, fontWeight: "800" }, subtitle: { color: brandColors.muted, lineHeight: 20, marginTop: 6, marginBottom: 16 }, label: { color: brandColors.text, fontWeight: "800", marginTop: 8, marginBottom: 7 }, input: { backgroundColor: "#fff", borderColor: "#cbd5e1", borderWidth: 1, borderRadius: 12, color: brandColors.text, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 }, reason: { minHeight: 120 }, error: { color: brandColors.danger, lineHeight: 20, marginTop: 12 }, success: { backgroundColor: "#dcfce7", borderRadius: 12, marginTop: 12, padding: 12 }, successText: { color: "#166534", lineHeight: 20 }, submit: { alignItems: "center", backgroundColor: brandColors.primary, borderRadius: 14, marginTop: 16, minHeight: 48, justifyContent: "center" }, submitDisabled: { opacity: 0.65 }, submitText: { color: "#fff", fontWeight: "800" }, secondary: { alignItems: "center", backgroundColor: brandColors.primarySoft, borderRadius: 14, marginTop: 10, minHeight: 46, justifyContent: "center" }, secondaryText: { color: brandColors.primary, fontWeight: "800" },
});

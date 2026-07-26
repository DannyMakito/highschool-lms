import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { ChildSummaryCard } from "../../src/components/ChildSummaryCard";
import { SectionCard } from "../../src/components/SectionCard";

export default function ProfileScreen() {
  const { parent, children, activeChild, logout, updateParentProfile } = useAuth();
  const [fullName, setFullName] = useState(parent?.fullName ?? "");
  const [email, setEmail] = useState(parent?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(parent?.avatarUrl ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(parent?.fullName ?? "");
    setEmail(parent?.email ?? "");
    setAvatarUrl(parent?.avatarUrl ?? "");
  }, [parent]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateParentProfile({ fullName: fullName.trim(), email: email.trim(), avatarUrl: avatarUrl.trim() || null });
    setSaving(false);
    if (!result.success) {
      setMessage(result.message || "Unable to save profile.");
      return;
    }
    setEditing(false);
    setMessage("Profile updated successfully.");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Your account, linked learners, and shortcuts live here.</Text>

      <SectionCard title="Account">
        {editing ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput value={fullName} onChangeText={setFullName} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Avatar URL</Text>
              <TextInput value={avatarUrl} onChangeText={setAvatarUrl} autoCapitalize="none" style={styles.input} />
            </View>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <View style={styles.actionsRow}>
              <Pressable style={[styles.actionButtonSecondary, styles.flexGrow]} onPress={() => setEditing(false)} disabled={saving}>
                <Text style={styles.actionButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, styles.flexGrow]} onPress={handleSave} disabled={saving}>
                <Text style={styles.actionButtonText}>{saving ? "Saving…" : "Save changes"}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
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
            <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit profile</Text>
            </Pressable>
          </>
        )}
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
  field: {
    marginBottom: 14,
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 4,
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
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    color: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },
  editButton: {
    marginTop: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  editButtonText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexGrow: {
    flex: 1,
  },
  message: {
    color: "#0f172a",
    marginBottom: 10,
  },
});

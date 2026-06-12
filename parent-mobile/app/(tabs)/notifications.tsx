import { ScrollView, StyleSheet, Text } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";

export default function NotificationsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.subtitle}>This tab will later show attendance, grade, and school announcements alerts.</Text>

      <SectionCard title="No alerts yet">
        <Text style={styles.body}>Once we connect the notification feed, this screen will become the parent alert inbox.</Text>
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
  body: {
    color: "#334155",
    lineHeight: 20,
  },
});

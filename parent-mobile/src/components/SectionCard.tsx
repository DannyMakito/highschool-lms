import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { brandColors } from "../theme/brand";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brandColors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    color: brandColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: brandColors.placeholder,
    marginBottom: 12,
    lineHeight: 18,
  },
});

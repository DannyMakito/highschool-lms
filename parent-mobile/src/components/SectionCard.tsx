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
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    color: brandColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: brandColors.placeholder,
    marginBottom: 12,
  },
});

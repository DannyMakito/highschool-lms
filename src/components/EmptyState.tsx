import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { brandColors } from "../theme/brand";

export function EmptyState({ icon = "sparkles-outline", message }: { icon?: keyof typeof Ionicons.glyphMap; message: string }) {
  return <View style={styles.wrap}><Ionicons name={icon} size={20} color={brandColors.placeholder} /><Text style={styles.text}>{message}</Text></View>;
}

const styles = StyleSheet.create({ wrap: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 }, text: { color: brandColors.placeholder, fontSize: 14, textAlign: "center" } });

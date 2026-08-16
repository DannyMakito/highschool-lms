import { useRouter } from "expo-router";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";

export default function PortalChoiceScreen() {
  const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}><View style={{ flex: 1, justifyContent: "center", padding: 28, gap: 18 }}><Text style={{ color: "#93c5fd", fontSize: 12, fontWeight: "800", letterSpacing: 1.6 }}>AFRINEXEL LMS</Text><Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "800" }}>Welcome</Text><Text style={{ color: "#cbd5e1", fontSize: 16, lineHeight: 24, marginBottom: 14 }}>Choose the portal that matches your school account.</Text><TouchableOpacity onPress={() => router.push("/login")} style={{ backgroundColor: "#2563eb", padding: 20, borderRadius: 18 }}><Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800" }}>Student portal</Text><Text style={{ color: "#dbeafe", marginTop: 4 }}>Homework, subjects, assessments and learning tools</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push("/parent-login")} style={{ backgroundColor: "#ffffff", padding: 20, borderRadius: 18 }}><Text style={{ color: "#0f172a", fontSize: 18, fontWeight: "800" }}>Parent portal</Text><Text style={{ color: "#475569", marginTop: 4 }}>Your child’s progress, attendance and teacher messages</Text></TouchableOpacity></View></SafeAreaView>;
}

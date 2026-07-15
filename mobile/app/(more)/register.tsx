import React from "react";
import { UserPlus } from "lucide-react-native";
import { PlaceholderScreen, ComingSoon } from "../../components/ui/placeholder-screen";

export default function RegisterScreen() {
  return (
    <PlaceholderScreen title="Register" subtitle="Enroll in subjects and classes" icon={UserPlus}>
      <ComingSoon icon={UserPlus} label="Registration is handled by your school" />
    </PlaceholderScreen>
  );
}

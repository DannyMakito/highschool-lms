import React from "react";
import { GraduationCap } from "lucide-react-native";
import { PlaceholderScreen, EmptyCheck } from "../../components/ui/placeholder-screen";

export default function GradesScreen() {
  return (
    <PlaceholderScreen title="Grades" subtitle="Your gradebook" icon={GraduationCap}>
      <EmptyCheck message="No grades available" />
    </PlaceholderScreen>
  );
}

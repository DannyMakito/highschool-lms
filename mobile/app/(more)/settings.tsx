import React from "react";
import { Settings } from "lucide-react-native";
import { PlaceholderScreen, ComingSoon } from "../../components/ui/placeholder-screen";

export default function SettingsScreen() {
  return (
    <PlaceholderScreen title="Settings" subtitle="App preferences" icon={Settings}>
      <ComingSoon icon={Settings} label="Settings are not available yet" />
    </PlaceholderScreen>
  );
}

import { Stack, useSegments } from "expo-router";
import { View } from "react-native";
import { MessagingProvider } from "../../src/context/MessagingContext";
import { SubjectsProvider } from "../../src/context/SubjectsContext";
import { AssignmentsProvider } from "../../src/context/AssignmentsContext";
import { RegistrationDataProvider } from "../../src/context/RegistrationDataContext";
import { BottomTabBar } from "../../components/ui/bottom-tab-bar";

export default function MoreLayout() {
  const segments = useSegments();
  const isInQuiz = segments.includes("take");

  return (
    <SubjectsProvider>
      <AssignmentsProvider>
        <MessagingProvider>
          <RegistrationDataProvider>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
              {!isInQuiz && <BottomTabBar />}
            </View>
          </RegistrationDataProvider>
        </MessagingProvider>
      </AssignmentsProvider>
    </SubjectsProvider>
  );
}

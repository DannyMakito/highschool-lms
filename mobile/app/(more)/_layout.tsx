import { Stack } from "expo-router";
import { MessagingProvider } from "../../src/context/MessagingContext";
import { SubjectsProvider } from "../../src/context/SubjectsContext";
import { AssignmentsProvider } from "../../src/context/AssignmentsContext";

export default function MoreLayout() {
  return (
    <SubjectsProvider>
      <AssignmentsProvider>
        <MessagingProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </MessagingProvider>
      </AssignmentsProvider>
    </SubjectsProvider>
  );
}

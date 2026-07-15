import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SubjectsProvider } from '../../src/context/SubjectsContext';
import { RegistrationDataProvider } from '../../src/context/RegistrationDataContext';
import { AssignmentsProvider } from '../../src/context/AssignmentsContext';
import { MessagingProvider } from '../../src/context/MessagingContext';
import { BottomTabBar } from '../../components/ui/bottom-tab-bar';

export default function SubjectsLayout() {
  return (
    <SubjectsProvider>
      <RegistrationDataProvider>
        <AssignmentsProvider>
          <MessagingProvider>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
              <BottomTabBar />
            </View>
          </MessagingProvider>
        </AssignmentsProvider>
      </RegistrationDataProvider>
    </SubjectsProvider>
  );
}

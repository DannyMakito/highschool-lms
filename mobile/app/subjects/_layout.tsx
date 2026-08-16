import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SubjectsProvider } from '../../src/context/SubjectsContext';
import { RegistrationDataProvider } from '../../src/context/RegistrationDataContext';
import { AssignmentsProvider } from '../../src/context/AssignmentsContext';
import { MessagingProvider } from '../../src/context/MessagingContext';

export default function SubjectsLayout() {
  return (
    <SubjectsProvider>
      <RegistrationDataProvider>
        <AssignmentsProvider>
          <MessagingProvider>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </MessagingProvider>
        </AssignmentsProvider>
      </RegistrationDataProvider>
    </SubjectsProvider>
  );
}

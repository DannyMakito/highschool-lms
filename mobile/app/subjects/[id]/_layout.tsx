import { Stack } from 'expo-router';
import { View } from 'react-native';
import { BottomTabBar } from '../../../components/ui/bottom-tab-bar';

export default function SubjectIdLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <BottomTabBar />
    </View>
  );
}

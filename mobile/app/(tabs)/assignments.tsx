import { View, Text, ScrollView } from 'react-native';

export default function AssignmentsScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-950 p-6">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-white">Assignments</Text>
        <Text className="text-sm text-slate-400">Track your upcoming quizzes and assignments.</Text>
      </View>
    </ScrollView>
  );
}

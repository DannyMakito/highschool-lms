import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <ScrollView className="flex-1 bg-slate-950 p-6">
      <View className="mb-6">
        <Text className="text-2xl font-bold text-white">Welcome back, {user?.name}!</Text>
        <Text className="text-sm text-slate-400">Here's an overview of your progress.</Text>
      </View>
      
      {/* Dummy UI for now, we will add UI components later */}
      <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-4">
        <Text className="text-lg font-semibold text-white">Recent Announcements</Text>
        <Text className="text-slate-400 mt-2">No new announcements at the moment.</Text>
      </View>

      <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <Text className="text-lg font-semibold text-white">Your Subjects</Text>
        <Text className="text-slate-400 mt-2">You are enrolled in 4 subjects.</Text>
      </View>
    </ScrollView>
  );
}

import { Tabs } from 'expo-router';
import { Home, BookOpen, FileText, Sparkles, LogOut } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { SubjectsProvider } from '../../src/context/SubjectsContext';
import { RegistrationDataProvider } from '../../src/context/RegistrationDataContext';
import { AssignmentsProvider } from '../../src/context/AssignmentsContext';
import { MessagingProvider } from '../../src/context/MessagingContext';
import { HeaderMenu } from '../../components/ui/header-menu';

export default function TabLayout() {
  const { logout } = useAuth();

  return (
    <SubjectsProvider>
      <RegistrationDataProvider>
        <AssignmentsProvider>
          <MessagingProvider>
            <Tabs
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#0f172a',
                },
                headerTintColor: '#fff',
                headerRight: () => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <HeaderMenu />
                    <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
                      <LogOut color="#ef4444" size={20} />
                    </TouchableOpacity>
                  </View>
                ),
                tabBarStyle: {
                  backgroundColor: '#0f172a',
                  borderTopColor: '#1e293b',
                },
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#64748b',
              }}>
              <Tabs.Screen
                name="index"
                options={{
                  title: 'Dashboard',
                  tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
              />
              <Tabs.Screen
                name="subjects"
                options={{
                  title: 'Subjects',
                  tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
                }}
              />
              <Tabs.Screen
                name="assignments"
                options={{
                  title: 'Assignments',
                  tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
                }}
              />
              <Tabs.Screen
                name="tutor"
                options={{
                  title: 'AI Tutor',
                  tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
                }}
              />
            </Tabs>
          </MessagingProvider>
        </AssignmentsProvider>
      </RegistrationDataProvider>
    </SubjectsProvider>
  );
}

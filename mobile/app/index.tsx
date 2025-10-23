import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Root() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#111', tabBarStyle: { backgroundColor: '#fff' } }}>
      <Tabs.Screen name="setup" options={{ title: 'Setup', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="lights" options={{ title: 'Lights', tabBarIcon: ({ color, size }) => <Ionicons name="bulb-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="monitor" options={{ title: 'Monitor', tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}

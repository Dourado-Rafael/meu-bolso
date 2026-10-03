import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

const ICONS = {
  index: 'home-outline',
  lancamentos: 'receipt-outline',
  recorrentes: 'repeat-outline',
  devedores: 'people-outline',
  teto: 'wallet-outline',
  ajustes: 'settings-outline',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name] || 'ellipse-outline'} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="lancamentos" options={{ title: 'Lançamentos' }} />
      <Tabs.Screen name="recorrentes" options={{ title: 'Recorrentes' }} />
      <Tabs.Screen name="devedores" options={{ title: 'Devedores' }} />
      <Tabs.Screen name="teto" options={{ title: 'Teto' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

import { Stack } from 'expo-router';
import { LandsProvider } from '../src/context/LandsContext';

export default function RootLayout() {
  return (
    <LandsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="map" />
        <Stack.Screen name="list" />
      </Stack>
    </LandsProvider>
  );
}
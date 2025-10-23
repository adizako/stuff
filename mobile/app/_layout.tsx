import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { preloadSeasonSchedule } from '@/lib/schedule';
import { registerBackgroundTask } from '@/lib/background';

export default function Layout() {
  useEffect(() => {
    (async () => {
      // Warm schedule cache weekly
      const last = Number(await AsyncStorage.getItem('scheduleUpdatedAt') ?? '0');
      const weekMs = 7 * 24 * 3600_000;
      if (Date.now() - last > weekMs) {
        try { await preloadSeasonSchedule(); } catch {}
      }
      try { await registerBackgroundTask(15); } catch {}
    })();
  }, []);
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLiveGames, detectScoreIncreases } from './nfl';
import { flashColors } from './hue';
import { TEAM_COLORS } from './teams';

export const TASK_NAME = 'huetd-background-poll';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const cfgRaw = await AsyncStorage.getItem('cfg');
    const teamsRaw = await AsyncStorage.getItem('teams');
    const lightIdsRaw = await AsyncStorage.getItem('lightIds');
    if (!cfgRaw) return BackgroundFetch.Result.NoData;
    const cfg = JSON.parse(cfgRaw) as { bridgeIp: string; username?: string; onlyTD?: boolean; pollSeconds?: number };
    const selected: string[] = teamsRaw ? JSON.parse(teamsRaw) : [];
    const lightIds: number[] = lightIdsRaw ? JSON.parse(lightIdsRaw) : [];
    const games = await fetchLiveGames();
    const live = games.filter(g => ['in', 'post', 'delay'].includes(g.status));
    const prevRaw = (await AsyncStorage.getItem('prevScores')) ?? '{}';
    const prev = JSON.parse(prevRaw) as Record<string, [number, number]>;
    for (const g of live) {
      if (!(g.id in prev)) prev[g.id] = [g.home.score, g.away.score];
    }
    const events = detectScoreIncreases(prev, live, Boolean(cfg.onlyTD));
    for (const ev of events) {
      const team = ev.side === 'home' ? ev.game.home : ev.game.away;
      if (selected.includes(team.abbreviation)) {
        const colors = TEAM_COLORS[team.abbreviation];
        if (colors) await flashColors({ bridgeIp: cfg.bridgeIp, username: cfg.username, lightIds }, colors as any);
      }
    }
    const nextPrev: Record<string, [number, number]> = { ...prev };
    for (const g of live) nextPrev[g.id] = [g.home.score, g.away.score];
    await AsyncStorage.setItem('prevScores', JSON.stringify(nextPrev));
    return events.length ? BackgroundFetch.Result.NewData : BackgroundFetch.Result.NoData;
  } catch (e) {
    return BackgroundFetch.Result.Failed;
  }
});

export async function registerBackgroundTask(minuteInterval = 15) {
  await BackgroundFetch.registerTaskAsync(TASK_NAME, {
    minimumInterval: Math.max(15 * 60, minuteInterval * 60), // Android minimum ~15min
    stopOnTerminate: false,
    startOnBoot: true,
    requiresCharging: false,
    requiredNetworkType: BackgroundFetch.NetworkType.ANY,
  });
}

export async function unregisterBackgroundTask() {
  await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
}

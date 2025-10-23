import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLiveGames, detectScoreIncreases, GameState } from '@/lib/nfl';
import { flashColors, HueConfig } from '@/lib/hue';
import { TEAM_COLORS } from '@/lib/teams';

export default function Monitor() {
  const [log, setLog] = useState<string[]>([]);
  const prevRef = useRef<Record<string, [number, number]>>({});
  const [running, setRunning] = useState(false);

  const append = (line: string) => setLog(l => [line, ...l].slice(0, 100));

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    async function tick() {
      try {
        const cfgRaw = await AsyncStorage.getItem('cfg');
        const teamsRaw = await AsyncStorage.getItem('teams');
        const lightIdsRaw = await AsyncStorage.getItem('lightIds');
        if (!cfgRaw) return;
        const cfg = JSON.parse(cfgRaw) as { bridgeIp: string; username?: string; onlyTD?: boolean; pollSeconds?: number };
        const selected: string[] = teamsRaw ? JSON.parse(teamsRaw) : [];
        const lightIds: number[] = lightIdsRaw ? JSON.parse(lightIdsRaw) : [];
        const games = await fetchLiveGames();
        const live = games.filter(g => ['in', 'post', 'delay'].includes(g.status));
        const activelyPlaying = games
          .filter(g => ['in', 'delay'].includes(g.status))
          .some(g => selected.includes(g.home.abbreviation) || selected.includes(g.away.abbreviation));
        for (const g of live) {
          if (!(g.id in prevRef.current)) prevRef.current[g.id] = [g.home.score, g.away.score];
        }
        const events = detectScoreIncreases(prevRef.current, live, Boolean(cfg.onlyTD));
        for (const ev of events) {
          const team = ev.side === 'home' ? ev.game.home : ev.game.away;
          if (selected.includes(team.abbreviation)) {
            const colors = TEAM_COLORS[team.abbreviation];
            if (colors) {
              append(`${team.displayName} scored! ${ev.game.away.abbreviation} ${ev.game.away.score} - ${ev.game.home.abbreviation} ${ev.game.home.score}`);
              await flashColors({ bridgeIp: cfg.bridgeIp, username: cfg.username, lightIds }, colors as any);
            }
          }
        }
        for (const g of live) prevRef.current[g.id] = [g.home.score, g.away.score];
        // Dynamic polling: ~10s when selected team is playing; otherwise back off to ~60s
        const nextMs = activelyPlaying ? 10_000 : 60_000;
        timer = setTimeout(tick, nextMs);
      } catch (e: any) {
        append(`Error: ${e?.message ?? String(e)}`);
        timer = setTimeout(tick, 5000);
      }
    }
    if (running) tick();
    return () => { if (timer) clearTimeout(timer); };
  }, [running]);

  return (
    <View style={s.container}>
      <Text style={s.title}>Monitor</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => setRunning(true)} style={[s.button, running && s.buttonOn]}><Text style={s.buttonText}>Start</Text></Pressable>
        <Pressable onPress={() => setRunning(false)} style={s.button}><Text style={s.buttonText}>Stop</Text></Pressable>
      </View>
      <ScrollView style={s.log} contentContainerStyle={{ padding: 12 }}>
        {log.map((l, idx) => (<Text key={idx} style={s.logLine}>{l}</Text>))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9fb' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16 },
  button: { backgroundColor: '#111', padding: 12, borderRadius: 12 },
  buttonOn: { backgroundColor: '#0a0' },
  buttonText: { color: '#fff', fontWeight: '600' },
  log: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e3e3e8' },
  logLine: { color: '#111', marginBottom: 8 },
});

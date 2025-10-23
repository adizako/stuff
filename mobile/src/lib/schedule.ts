import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScheduleEvent = {
  id: string;
  start: string; // ISO
  home: string;  // abbr
  away: string;  // abbr
  seasonType: 'regular' | 'post';
  week?: number;
};

const ESPN_SB = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

function parseAbbr(c: any): string {
  return String(c?.team?.abbreviation ?? '').toUpperCase();
}

export async function fetchWeekSchedule(seasonType: 2 | 3, week: number): Promise<ScheduleEvent[]> {
  const { data } = await axios.get(ESPN_SB, { params: { seasontype: seasonType, week }, timeout: 10000 });
  const events: ScheduleEvent[] = [];
  for (const ev of data?.events ?? []) {
    const comp = (ev.competitions ?? [{}])[0];
    const comps = comp?.competitors ?? [];
    const home = comps.find((c: any) => c.homeAway === 'home');
    const away = comps.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;
    events.push({
      id: String(ev.id),
      start: String(ev.date),
      home: parseAbbr(home),
      away: parseAbbr(away),
      seasonType: seasonType === 2 ? 'regular' : 'post',
      week,
    });
  }
  return events;
}

export async function preloadSeasonSchedule(maxWeeks: number = 22): Promise<ScheduleEvent[]> {
  const all: ScheduleEvent[] = [];
  // Regular season (2) weeks ~1..18
  for (let w = 1; w <= maxWeeks; w++) {
    const weekEvents = await fetchWeekSchedule(2, w);
    if (weekEvents.length === 0 && w > 4) break; // stop when empty after early weeks
    all.push(...weekEvents);
  }
  // Postseason (3) weeks ~1..5
  for (let w = 1; w <= 8; w++) {
    const weekEvents = await fetchWeekSchedule(3, w);
    if (weekEvents.length === 0 && w > 2) break;
    all.push(...weekEvents);
  }
  await AsyncStorage.setItem('schedule', JSON.stringify(all));
  await AsyncStorage.setItem('scheduleUpdatedAt', String(Date.now()));
  return all;
}

export async function getUpcomingForTeams(teamAbbrs: string[], horizonHours = 8): Promise<ScheduleEvent[]> {
  const raw = await AsyncStorage.getItem('schedule');
  if (!raw) return [];
  const all: ScheduleEvent[] = JSON.parse(raw);
  const now = Date.now();
  const horizon = now + horizonHours * 3600_000;
  return all.filter(ev => {
    const t = Date.parse(ev.start);
    if (!Number.isFinite(t)) return false;
    if (t < now - 6 * 3600_000) return false; // old
    if (t > horizon) return false;
    return teamAbbrs.includes(ev.home) || teamAbbrs.includes(ev.away);
  });
}

export function windowForEvent(ev: ScheduleEvent, preMinutes = 15, postHours = 4): { startMs: number; endMs: number } {
  const t = Date.parse(ev.start);
  const startMs = t - preMinutes * 60_000;
  const endMs = t + postHours * 3600_000;
  return { startMs, endMs };
}

import axios from 'axios';

export type TeamScore = {
  id: string;
  abbreviation: string;
  displayName: string;
  score: number;
};

export type GameState = {
  id: string;
  clock: string;
  period: number;
  status: string; // 'in', 'post', 'pre', 'delay'
  home: TeamScore;
  away: TeamScore;
};

const NFL_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export async function fetchLiveGames(): Promise<GameState[]> {
  const resp = await axios.get(NFL_SCOREBOARD_URL, { timeout: 10000 });
  const data = resp.data;
  const games: GameState[] = [];
  for (const event of data?.events ?? []) {
    const comp = (event.competitions ?? [{}])[0];
    const statusInfo = comp?.status?.type ?? {};
    const statusState = String(statusInfo?.state ?? 'unknown').toLowerCase();
    const competitors = comp?.competitors ?? [];
    const homeRaw = competitors.find((c: any) => c.homeAway === 'home');
    const awayRaw = competitors.find((c: any) => c.homeAway === 'away');
    if (!homeRaw || !awayRaw) continue;
    const parseTeam = (c: any): TeamScore => ({
      id: String(c?.team?.id ?? ''),
      abbreviation: String(c?.team?.abbreviation ?? ''),
      displayName: String(c?.team?.displayName ?? ''),
      score: Number(c?.score ?? 0),
    });
    games.push({
      id: String(event?.id ?? ''),
      clock: String(statusInfo?.displayClock ?? ''),
      period: Number(statusInfo?.period ?? 0),
      status: statusState,
      home: parseTeam(homeRaw),
      away: parseTeam(awayRaw),
    });
  }
  return games;
}

export function detectScoreIncreases(
  prev: Record<string, [number, number]>,
  current: GameState[],
  onlyTouchdowns: boolean = false,
): Array<{ game: GameState; side: 'home' | 'away' }> {
  const events: Array<{ game: GameState; side: 'home' | 'away' }> = [];
  for (const g of current) {
    const [ph, pa] = prev[g.id] ?? [g.home.score, g.away.score];
    const dh = g.home.score - ph;
    const da = g.away.score - pa;
    if (dh > 0) {
      if (!onlyTouchdowns || [6, 7, 8].includes(dh)) events.push({ game: g, side: 'home' });
    }
    if (da > 0) {
      if (!onlyTouchdowns || [6, 7, 8].includes(da)) events.push({ game: g, side: 'away' });
    }
  }
  return events;
}

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

import requests

NFL_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"


@dataclass
class TeamScore:
    id: str
    abbreviation: str
    display_name: str
    score: int


@dataclass
class GameState:
    id: str
    clock: str
    period: int
    status: str  # e.g., 'in', 'post', 'pre'
    home: TeamScore
    away: TeamScore


def fetch_live_games() -> List[GameState]:
    resp = requests.get(NFL_SCOREBOARD_URL, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    games: List[GameState] = []
    for event in data.get("events", []):
        comp = (event.get("competitions") or [{}])[0]
        status_info = comp.get("status", {}).get("type", {})
        status_state = status_info.get("state", "unknown").lower()
        if status_state not in ("in", "post", "postponed", "delay"):
            # consider "in" as live; we still parse post to detect final but ignore for triggering
            pass
        competitors = comp.get("competitors", [])
        home_raw = next((c for c in competitors if c.get("homeAway") == "home"), None)
        away_raw = next((c for c in competitors if c.get("homeAway") == "away"), None)
        if not home_raw or not away_raw:
            continue
        def parse_team(c: Dict) -> TeamScore:
            team = c.get("team", {})
            return TeamScore(
                id=str(team.get("id")),
                abbreviation=team.get("abbreviation", ""),
                display_name=team.get("displayName", ""),
                score=int(c.get("score") or 0),
            )
        home = parse_team(home_raw)
        away = parse_team(away_raw)
        games.append(
            GameState(
                id=str(event.get("id")),
                clock=status_info.get("displayClock", ""),
                period=int(status_info.get("period") or 0),
                status=status_state,
                home=home,
                away=away,
            )
        )
    return games


def detect_score_increases(prev: Dict[str, Tuple[int, int]], current_games: Iterable[GameState], only_touchdowns: bool = False) -> List[Tuple[GameState, str]]:
    """
    Returns list of (game, side) for each detected scoring change. side in {"home","away"}
    If only_touchdowns=True, we attempt to infer TD by 6-8 point jump between checks.
    This is heuristic because ESPN API doesn't expose scoring play types here.
    """
    events: List[Tuple[GameState, str]] = []
    for game in current_games:
        prev_home, prev_away = prev.get(game.id, (game.home.score, game.away.score))
        dh = game.home.score - prev_home
        da = game.away.score - prev_away
        if dh > 0:
            if only_touchdowns:
                if dh in (6, 7, 8):
                    events.append((game, "home"))
            else:
                events.append((game, "home"))
        if da > 0:
            if only_touchdowns:
                if da in (6, 7, 8):
                    events.append((game, "away"))
            else:
                events.append((game, "away"))
    return events

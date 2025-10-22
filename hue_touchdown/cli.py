from __future__ import annotations

import sys
import time
from typing import List, Optional

import typer
from rich import print
from rich.table import Table

from .config import AppConfig, load_config, save_config
from .hue import HueController
from .nfl import detect_score_increases, fetch_live_games
from .teams import ALL_TEAMS, TEAM_COLORS

app = typer.Typer(add_completion=False, no_args_is_help=True, help="Flash Philips Hue lights when your NFL teams score.")


@app.command()
def configure(
    bridge_ip: str = typer.Option(..., help="IP address of the Philips Hue bridge"),
    username: Optional[str] = typer.Option(None, help="Hue API username (optional; press link button when prompted)"),
    light_ids: Optional[List[int]] = typer.Option(None, help="Light IDs to use (default: all lights)", metavar="ID"),
    poll_seconds: int = typer.Option(5, help="Polling interval in seconds"),
    only_touchdowns: bool = typer.Option(False, help="Only trigger on touchdowns (heuristic)"),
):
    cfg = AppConfig(bridge_ip=bridge_ip, username=username, selected_teams=[], light_ids=light_ids or [], poll_seconds=poll_seconds, only_touchdowns=only_touchdowns)
    save_config(cfg)
    print("[green]Saved configuration to ~/.hue_touchdown.json[/green]")


@app.command()
def choose_teams(
    teams: Optional[List[str]] = typer.Argument(None, metavar="TEAM", help="Team abbreviations (e.g., KC, PHI). If omitted, interactive list is shown."),
):
    cfg = load_config()
    if not cfg:
        print("[red]Run 'configure' first.[/red]")
        raise typer.Exit(1)

    if not teams:
        table = Table(title="NFL Teams")
        table.add_column("Abbr")
        table.add_column("Colors (RGB)")
        for abbr, colors in TEAM_COLORS.items():
            table.add_row(abbr, ", ".join(str(c) for c in colors))
        print(table)
        print("Use: hue-td choose-teams KC PHI ...")
        raise typer.Exit(0)

    invalid = [t for t in teams if t.upper() not in TEAM_COLORS]
    if invalid:
        print(f"[red]Invalid team(s): {', '.join(invalid)}[/red]")
        raise typer.Exit(1)

    cfg.selected_teams = [t.upper() for t in teams]
    save_config(cfg)
    print(f"[green]Saved {len(cfg.selected_teams)} team(s).[/green]")


@app.command()
def test_flash(team: str = typer.Argument(..., help="Team abbreviation to test colors for")):
    cfg = load_config()
    if not cfg:
        print("[red]Run 'configure' first.[/red]")
        raise typer.Exit(1)
    team = team.upper()
    if team not in TEAM_COLORS:
        print("[red]Unknown team.[/red]")
        raise typer.Exit(1)

    hue = HueController(cfg.bridge_ip, cfg.username)
    print("Connecting to Hue bridge... press link button if asked.")
    hue.connect()
    hue.flash_colors(cfg.light_ids or None, TEAM_COLORS[team])


@app.command()
def monitor():
    cfg = load_config()
    if not cfg or not cfg.selected_teams:
        print("[red]Run 'configure' and 'choose-teams' first.[/red]")
        raise typer.Exit(1)

    hue = HueController(cfg.bridge_ip, cfg.username)
    print("Connecting to Hue bridge... press link button if asked.")
    hue.connect()

    prev_scores = {}
    print(f"Monitoring teams: {', '.join(cfg.selected_teams)} (poll {cfg.poll_seconds}s, touchdowns-only={cfg.only_touchdowns})")
    while True:
        try:
            games = fetch_live_games()
            # Filter live or recently updated games only
            live_games = [g for g in games if g.status in ("in", "post", "delay")]
            # Build prev map entries
            for g in live_games:
                if g.id not in prev_scores:
                    prev_scores[g.id] = (g.home.score, g.away.score)
            # Detect
            events = detect_score_increases(prev_scores, live_games, cfg.only_touchdowns)
            for game, side in events:
                team = game.home if side == "home" else game.away
                if team.abbreviation.upper() in cfg.selected_teams:
                    colors = TEAM_COLORS.get(team.abbreviation.upper())
                    if colors:
                        print(f"[bold yellow]{team.display_name} scored! {game.away.abbreviation} {game.away.score} - {game.home.abbreviation} {game.home.score}[/bold yellow]")
                        hue.flash_colors(cfg.light_ids or None, colors)
            # Update prev
            for g in live_games:
                prev_scores[g.id] = (g.home.score, g.away.score)
            time.sleep(cfg.poll_seconds)
        except KeyboardInterrupt:
            print("Exiting.")
            raise typer.Exit(0)
        except Exception as e:
            print(f"[red]Error: {e}[/red]")
            time.sleep(cfg.poll_seconds)


@app.command()
def list_lights():
    """List available Hue lights and their IDs."""
    cfg = load_config()
    if not cfg:
        print("[red]Run 'configure' first.[/red]")
        raise typer.Exit(1)
    hue = HueController(cfg.bridge_ip, cfg.username)
    print("Connecting to Hue bridge... press link button if asked.")
    hue.connect()
    lights = hue.get_lights()
    table = Table(title="Hue Lights")
    table.add_column("ID")
    table.add_column("Name")
    table.add_column("On")
    for lid, light in lights.items():
        try:
            name = getattr(light, 'name', str(lid))
            on = getattr(light, 'on', False)
        except Exception:
            name = str(lid)
            on = False
        table.add_row(str(lid), str(name), "Yes" if on else "No")
    print(table)


def main():
    app()


if __name__ == "__main__":
    main()

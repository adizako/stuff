from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional

CONFIG_PATH = Path.home() / ".hue_touchdown.json"


@dataclass
class AppConfig:
    bridge_ip: str
    username: Optional[str] = None
    selected_teams: List[str] = None  # abbreviations
    light_ids: List[int] = None
    only_touchdowns: bool = False
    poll_seconds: int = 5


def load_config() -> Optional[AppConfig]:
    if not CONFIG_PATH.exists():
        return None
    data = json.loads(CONFIG_PATH.read_text())
    return AppConfig(**data)


def save_config(cfg: AppConfig) -> None:
    CONFIG_PATH.write_text(json.dumps(asdict(cfg), indent=2))

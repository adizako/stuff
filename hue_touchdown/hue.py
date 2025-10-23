from __future__ import annotations

import time
from typing import Dict, List, Optional, Tuple

try:
    from phue import Bridge
except Exception:  # pragma: no cover - phue may not be installed in CI
    Bridge = object  # type: ignore


class HueController:
    def __init__(self, bridge_ip: str, username: Optional[str] = None) -> None:
        self.bridge_ip = bridge_ip
        self.username = username
        self.bridge: Optional[Bridge] = None

    def connect(self) -> None:
        self.bridge = Bridge(self.bridge_ip, username=self.username) if self.username else Bridge(self.bridge_ip)
        try:
            self.bridge.connect()
        except Exception:
            # If not authorized yet, phue will raise and ask to press link button
            raise

    def get_lights(self) -> Dict[int, Dict]:
        assert self.bridge is not None, "Bridge not connected"
        return self.bridge.get_light_objects('id')  # type: ignore[no-any-return]

    def _xy_from_rgb(self, r: int, g: int, b: int) -> Tuple[float, float]:
        # Simple conversion; phue can also handle rgb to xy via Light.xy
        # But we keep a deterministic mapping here.
        # Normalize to 0..1
        rn, gn, bn = [x / 255.0 for x in (r, g, b)]
        # Linearize
        def lin(c: float) -> float:
            return pow((c + 0.055) / 1.055, 2.4) if c > 0.04045 else c / 12.92
        R, G, B = lin(rn), lin(gn), lin(bn)
        X = R * 0.664511 + G * 0.154324 + B * 0.162028
        Y = R * 0.283881 + G * 0.668433 + B * 0.047685
        Z = R * 0.000088 + G * 0.072310 + B * 0.986039
        if (X + Y + Z) == 0:
            return 0.0, 0.0
        return X / (X + Y + Z), Y / (X + Y + Z)

    def flash_colors(self, light_ids: Optional[List[int]], colors_rgb: List[Tuple[int, int, int]], flashes: int = 3, flash_ms: int = 400, brightness: int = 254) -> None:
        assert self.bridge is not None, "Bridge not connected"
        lights = self.get_lights()
        target_ids = light_ids or list(lights.keys())
        original_states = {}
        for lid in target_ids:
            light = lights[lid]
            original_states[lid] = {
                'on': light.on,
                'bri': getattr(light, 'brightness', getattr(light, 'bri', 254)),
                'xy': getattr(light, 'xy', None),
                'hue': getattr(light, 'hue', None),
                'sat': getattr(light, 'sat', None),
            }

        try:
            # Alternate through team colors for a few flashes
            for i in range(flashes):
                color = colors_rgb[i % len(colors_rgb)]
                x, y = self._xy_from_rgb(*color)
                for lid in target_ids:
                    light = lights[lid]
                    light.on = True
                    light.brightness = brightness
                    light.xy = [x, y]
                time.sleep(flash_ms / 1000.0)
                for lid in target_ids:
                    light = lights[lid]
                    light.on = False
                time.sleep(0.15)
        finally:
            # Restore original states
            for lid in target_ids:
                light = lights[lid]
                state = original_states[lid]
                light.on = state['on']
                if state['on']:
                    if state['xy'] is not None:
                        light.xy = state['xy']
                    if state['bri'] is not None:
                        light.brightness = state['bri']
                    if state['hue'] is not None and state['sat'] is not None:
                        light.hue = state['hue']
                        light.sat = state['sat']

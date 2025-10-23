import axios from 'axios';

export type Light = { id: number; name: string; on: boolean };

export type HueConfig = {
  bridgeIp: string;
  username?: string;
  lightIds?: number[];
};

// Basic Hue REST helpers (local network). User provides bridge IP and username.
export async function listLights(cfg: HueConfig): Promise<Light[]> {
  const base = `http://${cfg.bridgeIp}/api/${cfg.username ?? ''}`.replace(/\/$/, '');
  const { data } = await axios.get(`${base}/lights`, { timeout: 5000 });
  return Object.entries<any>(data).map(([id, l]) => ({ id: Number(id), name: l?.name ?? String(id), on: Boolean(l?.state?.on) }));
}

export async function setLightXY(cfg: HueConfig, id: number, xy: [number, number], bri: number = 254) {
  const base = `http://${cfg.bridgeIp}/api/${cfg.username ?? ''}`.replace(/\/$/, '');
  await axios.put(`${base}/lights/${id}/state`, { on: true, bri, xy }, { timeout: 5000 });
}

export async function setLightOn(cfg: HueConfig, id: number, on: boolean) {
  const base = `http://${cfg.bridgeIp}/api/${cfg.username ?? ''}`.replace(/\/$/, '');
  await axios.put(`${base}/lights/${id}/state`, { on }, { timeout: 5000 });
}

export function xyFromRgb(r: number, g: number, b: number): [number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const lin = (c: number) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);
  const R = lin(rn), G = lin(gn), B = lin(bn);
  const X = R * 0.664511 + G * 0.154324 + B * 0.162028;
  const Y = R * 0.283881 + G * 0.668433 + B * 0.047685;
  const Z = R * 0.000088 + G * 0.072310 + B * 0.986039;
  if (X + Y + Z === 0) return [0, 0];
  return [X / (X + Y + Z), Y / (X + Y + Z)];
}

export async function flashColors(cfg: HueConfig, colors: [number, number, number][], flashes = 3, flashMs = 400, bri = 254) {
  const lights = cfg.lightIds?.length ? cfg.lightIds : (await listLights(cfg)).map(l => l.id);
  for (let i = 0; i < flashes; i++) {
    const [r, g, b] = colors[i % colors.length];
    const xy = xyFromRgb(r, g, b);
    await Promise.all(lights.map(id => setLightXY(cfg, id, xy, bri)));
    await new Promise(res => setTimeout(res, flashMs));
    await Promise.all(lights.map(id => setLightOn(cfg, id, false)));
    await new Promise(res => setTimeout(res, 150));
  }
}

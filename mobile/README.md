# Hue Touchdown Mobile (Expo)

A clean, minimal Android app (Expo React Native) to flash Philips Hue lights in team colors when your selected NFL teams score.

## Requirements
- Android 8 (2017) or newer (5 years+ supported)
- Local network access to your Hue bridge

## Quick start
```bash
cd mobile
# Install expo deps (if building locally)
# npm i -g expo-cli  # optional if using EAS
npm install
npm run start
```

## Tabs
- Setup: Configure Hue bridge IP, optional username, polling, TD-only
- Teams: Select one or many teams
- Lights: Pick which Hue lights to use
- Monitor: Start polling; flashes on score increases

## Android
- Cleartext HTTP enabled for Hue local bridge calls

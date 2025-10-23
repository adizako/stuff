import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listLights, HueConfig } from '@/lib/hue';

export default function Lights() {
  const [lights, setLights] = useState<{ id: number; name: string; on: boolean }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      const cfgRaw = await AsyncStorage.getItem('cfg');
      if (!cfgRaw) return;
      const cfg: HueConfig = JSON.parse(cfgRaw);
      const ls = await listLights({ bridgeIp: cfg.bridgeIp, username: cfg.username });
      setLights(ls);
      const stored = await AsyncStorage.getItem('lightIds');
      if (stored) setSelected(JSON.parse(stored));
    })();
  }, []);

  const toggle = async (id: number) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    setSelected(next);
    await AsyncStorage.setItem('lightIds', JSON.stringify(next));
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Lights</Text>
      <FlatList
        data={lights}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => (
          <Pressable onPress={() => toggle(item.id)} style={[s.card, selected.includes(item.id) && s.cardOn]}>
            <Text style={s.cardText}>{item.name} (#{item.id})</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9fb' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e3e3e8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardOn: { backgroundColor: '#111' },
  cardText: { color: '#111', fontWeight: '600' },
});

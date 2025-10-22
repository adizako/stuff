import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_TEAMS } from '@/lib/teams';

export default function Teams() {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const teams = await AsyncStorage.getItem('teams');
      if (teams) setSelected(JSON.parse(teams));
    })();
  }, []);

  const toggle = async (abbr: string) => {
    const next = selected.includes(abbr) ? selected.filter(t => t !== abbr) : [...selected, abbr];
    setSelected(next);
    await AsyncStorage.setItem('teams', JSON.stringify(next));
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Teams</Text>
      <FlatList
        data={ALL_TEAMS}
        keyExtractor={(t) => t}
        numColumns={4}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => toggle(item)} style={[s.card, selected.includes(item) && s.cardOn]}>
            <Text style={s.cardText}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9fb' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16 },
  card: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e3e3e8' },
  cardOn: { backgroundColor: '#111' },
  cardText: { color: '#111', fontWeight: '600' },
});

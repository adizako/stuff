import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Setup() {
  const [bridgeIp, setBridgeIp] = useState('');
  const [username, setUsername] = useState('');
  const [onlyTD, setOnlyTD] = useState(false);
  const [poll, setPoll] = useState('5');

  useEffect(() => {
    (async () => {
      const cfg = await AsyncStorage.getItem('cfg');
      if (cfg) {
        const c = JSON.parse(cfg);
        setBridgeIp(c.bridgeIp ?? '');
        setUsername(c.username ?? '');
        setOnlyTD(Boolean(c.onlyTD));
        setPoll(String(c.pollSeconds ?? '5'));
      }
    })();
  }, []);

  const save = async () => {
    const cfg = { bridgeIp, username, onlyTD, pollSeconds: Number(poll || '5') };
    await AsyncStorage.setItem('cfg', JSON.stringify(cfg));
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.title}>Setup</Text>
      <Text style={s.label}>Bridge IP</Text>
      <TextInput value={bridgeIp} onChangeText={setBridgeIp} placeholder="192.168.1.2" style={s.input} />
      <Text style={s.label}>Hue Username</Text>
      <TextInput value={username} onChangeText={setUsername} placeholder="Optional" style={s.input} />
      <Text style={s.label}>Poll Seconds</Text>
      <TextInput value={poll} onChangeText={setPoll} keyboardType="numeric" style={s.input} />
      <Pressable onPress={() => setOnlyTD(v => !v)} style={[s.toggle, onlyTD && s.toggleOn]}>
        <Text style={s.toggleText}>{onlyTD ? 'Touchdowns only: ON' : 'Touchdowns only: OFF'}</Text>
      </Pressable>
      <Pressable onPress={save} style={s.button}><Text style={s.buttonText}>Save</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f9f9fb' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 6, color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e3e3e8' },
  toggle: { marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#eee' },
  toggleOn: { backgroundColor: '#d6f5d6' },
  toggleText: { textAlign: 'center', fontWeight: '500' },
  button: { marginTop: 24, backgroundColor: '#111', padding: 14, borderRadius: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});

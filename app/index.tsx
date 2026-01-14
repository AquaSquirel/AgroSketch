import React from 'react';
import { router } from 'expo-router';
import Home from '../src/screens/Home';
import { useLands } from '../src/context/LandsContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function App() {
  const { savedLands, selectLand } = useLands();

  const handleNavigate = (screen: string) => {
    if (screen === 'MAP') {
      // Garante que nenhum terreno estará selecionado ao criar um novo mapa
      selectLand(null);
      router.push('/map');
    } else if (screen === 'SAVED_LIST') {
      router.push('/list');
    } else if (screen === 'CALCULATOR_ONLY') {
      router.push('/calculator');
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={{ flex: 1, backgroundColor: '#FFF' }}>
        <Home
          onNavigate={handleNavigate}
          savedCount={savedLands.length}
        />
      </View>
    </SafeAreaProvider>
  );
}
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // <--- OBRIGATÓRIO
import { StatusBar } from 'expo-status-bar'; // <--- OBRIGATÓRIO PARA TRANSPARÊNCIA
import { SavedLand } from '../src/types'; // Ajustei para ./src (padrão Expo na raiz)

// Importação das telas
// Se suas pastas estão em src, o caminho padrão é ./src e não ../src
import Home from '../src/screens/Home'; 
import MapEditor from '../src/screens/MapEditor';
import SavedList from '../src/screens/SavedList';
import Calculator from '../src/screens/Calculator'; // Se existir esse arquivo

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('HOME');
  const [savedLands, setSavedLands] = useState<SavedLand[]>([]);
  const [selectedLand, setSelectedLand] = useState<SavedLand | null>(null);

  useEffect(() => { loadSavedLandsFromStorage(); }, []);

  const loadSavedLandsFromStorage = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('@my_lands');
      if (jsonValue != null) setSavedLands(JSON.parse(jsonValue));
    } catch (e) { console.log("Erro ao carregar", e); }
  }

  const handleSaveLand = async (newLand: SavedLand) => {
    // Lógica para atualizar ou criar novo
    let updatedList;
    const exists = savedLands.find(l => l.id === newLand.id);
    
    if (exists) {
        // Atualiza o existente
        updatedList = savedLands.map(l => l.id === newLand.id ? newLand : l);
    } else {
        // Cria novo
        updatedList = [...savedLands, newLand];
    }

    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
    setCurrentScreen('SAVED_LIST'); // Volta para a lista após salvar
  };

  const handleDeleteLand = async (id: string) => {
    const updatedList = savedLands.filter(l => l.id !== id);
    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
  };

  // Função auxiliar para garantir que "Novo Mapeamento" comece zerado
  const startNewMap = () => {
    setSelectedLand(null);
    setCurrentScreen('MAP');
  };

  return (
    // 1. Envolvemos tudo no SafeAreaProvider (Essencial para o SavedList funcionar)
    <SafeAreaProvider>
      
      {/* 2. Configuração da Barra Transparente */}
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      
      <View style={{ flex: 1, backgroundColor: '#FFF' }}>
        
        {currentScreen === 'HOME' && (
          <Home 
            onNavigate={(screen) => {
                // Se for para o mapa direto da home, garante que é um novo
                if (screen === 'MAP') setSelectedLand(null);
                setCurrentScreen(screen);
            }} 
            savedCount={savedLands.length} 
          />
        )}
        
        {currentScreen === 'MAP' && (
          <MapEditor 
            onBack={() => setCurrentScreen('HOME')} // Ou voltar para a lista se preferir
            onSave={handleSaveLand}
            initialLand={selectedLand}
          />
        )}

        {currentScreen === 'SAVED_LIST' && (
          <SavedList 
            lands={savedLands}
            onBack={() => setCurrentScreen('HOME')}
            
            // Ao abrir existente: seta o terreno e muda a tela
            onOpen={(land) => { setSelectedLand(land); setCurrentScreen('MAP'); }}
            
            onDelete={handleDeleteLand}
            
            // Ao criar novo: zera o terreno e muda a tela
            onCreateNew={startNewMap}
          />
        )}

        {/* Se você tiver a calculadora isolada */}
        {currentScreen === 'CALCULATOR_ONLY' && (
             // @ts-ignore - Caso o componente não aceite props ainda
            <Calculator onBack={() => setCurrentScreen('HOME')} />
        )}

      </View>
    </SafeAreaProvider>
  );
}
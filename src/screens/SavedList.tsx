import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <--- Usamos o Hook agora
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SavedLand } from '../types';

interface SavedListProps {
  lands: SavedLand[];
  onBack: () => void;
  onOpen: (land: SavedLand) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

export default function SavedList({ lands, onBack, onOpen, onDelete, onCreateNew }: SavedListProps) {
  const insets = useSafeAreaInsets(); // <--- Pega o tamanho exato do "notch"/câmera

  return (
    // 1. Trocamos SafeAreaView por View normal com flex: 1
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      
      {/* 2. O Header agora tem um paddingTop dinâmico */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>Meus Projetos</Text>
      </View>

      <FlatList
        data={lands}
        contentContainerStyle={[{ padding: 20 }, lands.length === 0 && { flex: 1 }]}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="sprout-outline" size={80} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>Nenhum projeto ainda</Text>
            <Text style={styles.emptySub}>Comece a mapear seu terreno agora mesmo para calcular áreas e planejar plantios.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={onCreateNew}>
                <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
                <Text style={styles.emptyButtonText}>NOVO MAPEAMENTO</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconBox}><MaterialCommunityIcons name="map-check" size={24} color="#FFF" /></View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.info}>{item.date} • {item.area > 10000 ? (item.area/10000).toFixed(2)+' ha' : item.area.toFixed(0)+' m²'}</Text>
            </View>
            <TouchableOpacity style={styles.btnOpen} onPress={() => onOpen(item)}><Text style={styles.btnTxt}>ABRIR</Text></TouchableOpacity>
            <TouchableOpacity style={{ padding: 10 }} onPress={() => Alert.alert("Excluir", "Apagar terreno?", [{text:"Não"}, {text:"Sim", style:'destructive', onPress:()=>onDelete(item.id)}])}>
              <MaterialCommunityIcons name="delete-outline" size={24} color="#FF5252" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // header agora não tem paddingTop fixo, pois definimos lá em cima dinamicamente
  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 20, // Só o espaçamento de baixo é fixo
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15, 
    backgroundColor: '#FFF', // O branco vai subir até o topo agora
    // Sombra para dar destaque e separar do conteúdo
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3.84, 
    elevation: 5, 
    zIndex: 10
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  iconBox: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#A5D6A7', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  info: { fontSize: 12, color: '#888' },
  btnOpen: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnTxt: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -50, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 20 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 10, marginBottom: 30 },
  emptyButton: { flexDirection: 'row', backgroundColor: '#2E7D32', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 50, alignItems: 'center', elevation: 5 },
  emptyButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});
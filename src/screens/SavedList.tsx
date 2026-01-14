import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useLands } from '../context/LandsContext';

export default function SavedList() {
  const insets = useSafeAreaInsets();
  const { savedLands, deleteLand, selectLand } = useLands();

  const handleOpen = (land) => {
    selectLand(land);
    router.push('/map');
  };

  const handleExperiment = (land) => {
    selectLand(land);
    if (land.experimentDraft && land.experimentDraft.blocks && land.experimentDraft.blocks.length > 0) {
        router.push({ pathname: '/experiment/result', params: { landId: land.id } });
    } else {
        router.push('/experiment');
    }
  };

  const handleMonitor = (land) => {
    router.push({ pathname: '/monitor/[id]', params: { id: land.id } });
  };

  const handleCreateNew = () => {
    selectLand(null);
    router.push('/map');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>Meus Projetos</Text>
      </View>

      <FlatList
        data={savedLands}
        contentContainerStyle={[{ padding: 20 }, savedLands.length === 0 && { flex: 1 }]}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="sprout-outline" size={80} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>Nenhum projeto ainda</Text>
            <Text style={styles.emptySub}>Comece a mapear seu terreno agora mesmo.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateNew}>
                <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
                <Text style={styles.emptyButtonText}>NOVO MAPEAMENTO</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Cabeçalho do Card */}
            <View style={styles.cardBody}>
                <View style={styles.iconBox}>
                    <MaterialCommunityIcons name="google-maps" size={28} color="#2E7D32" />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.info}>
                        <MaterialCommunityIcons name="ruler" size={12} color="#888" /> {item.area > 10000 ? (item.area/10000).toFixed(2)+' ha' : item.area.toFixed(0)+' m²'}
                        {'  •  '}
                        <MaterialCommunityIcons name="calendar" size={12} color="#888" /> {item.date}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => Alert.alert("Excluir", "Apagar terreno permanentemente?", [{text:"Cancelar"}, {text:"Apagar", style:'destructive', onPress:()=>deleteLand(item.id)}])}
                >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#B0BEC5" />
                </TouchableOpacity>
            </View>
            
            {/* Barra de Ações */}
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.actionItem} onPress={() => handleOpen(item)}>
                    <MaterialCommunityIcons name="map-marker-radius" size={20} color="#455A64" />
                    <Text style={styles.actionText}>Mapa</Text>
                </TouchableOpacity>
                
                <View style={styles.divider} />

                <TouchableOpacity style={styles.actionItem} onPress={() => handleMonitor(item)}>
                    <MaterialCommunityIcons name="notebook-outline" size={20} color="#0288D1" />
                    <Text style={[styles.actionText, { color: '#0288D1' }]}>Diário</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.actionItem} onPress={() => handleExperiment(item)}>
                    <MaterialCommunityIcons name="flask-outline" size={20} color="#7B1FA2" />
                    <Text style={[styles.actionText, { color: '#7B1FA2' }]}>Experimento</Text>
                </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#FFF',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5, zIndex: 10
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, overflow: 'hidden' },
  
  cardBody: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 15 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  info: { fontSize: 13, color: '#78909C' },
  deleteBtn: { padding: 8 },

  actionBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FAFAFA' },
  actionItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, flexDirection: 'row', gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#546E7A' },
  divider: { width: 1, backgroundColor: '#EEE', marginVertical: 8 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -50, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 20 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 10, marginBottom: 30 },
  emptyButton: { flexDirection: 'row', backgroundColor: '#2E7D32', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 50, alignItems: 'center', elevation: 5 },
  emptyButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});

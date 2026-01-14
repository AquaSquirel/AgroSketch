import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLands } from '../../src/context/LandsContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SavedLand, LandLog } from '../../src/types';

export default function MonitorTimeline() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getLandById, deleteLog } = useLands();
  const [land, setLand] = useState<SavedLand | undefined>(undefined);

  // Recarregar dados sempre que a tela ganhar foco
  useEffect(() => {
    if (id) {
        const found = getLandById(id);
        setLand(found);
    }
  }, [id, getLandById]);

  // Formata a data para exibir bonito
  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) + 
           ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenDetail = (log: LandLog) => {
    if (land) {
        router.push({ pathname: '/monitor/detail', params: { landId: land.id, logId: log.id } });
    }
  };

  const handleDelete = (logId: string) => {
      Alert.alert(
          "Excluir Registro",
          "Tem certeza que deseja apagar este diário?",
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Apagar", 
                  style: "destructive", 
                  onPress: async () => {
                      if (land) {
                          await deleteLog(land.id, logId);
                          // Atualiza o estado local forçando um reload simples ou dependendo do contexto reativo
                          const updatedLand = getLandById(land.id);
                          setLand(updatedLand);
                      }
                  } 
              }
          ]
      );
  };

  const renderLogItem = ({ item }: { item: LandLog }) => (
    <View style={styles.cardWrapper}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenDetail(item)} style={styles.cardContent}>
            <View style={styles.card}>
                {/* Layout Horizontal: Imagem Esquerda | Texto Direita */}
                <View style={{ flexDirection: 'row' }}>
                    {item.coverPhoto ? (
                        <Image source={{ uri: item.coverPhoto }} style={styles.cardCoverSide} resizeMode="cover" />
                    ) : (
                        // Placeholder se não tiver capa
                        <View style={[styles.cardCoverSide, { alignItems: 'center', justifyContent: 'center' }]}>
                            <MaterialCommunityIcons name="image-off-outline" size={24} color="#CCC" />
                        </View>
                    )}
                    
                    <View style={styles.cardBodySide}>
                        <Text numberOfLines={2} style={styles.cardTitle}>{item.title || 'Diário sem título'}</Text>
                        
                        <View style={styles.dateRow}>
                            <MaterialCommunityIcons name="calendar-clock" size={12} color="#888" />
                            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                        </View>

                        {/* Nota truncada */}
                        {item.note ? <Text numberOfLines={2} style={styles.noteText}>{item.note}</Text> : null}

                        {/* Badge de fotos extras */}
                        {item.photos && item.photos.length > 0 && (
                            <View style={styles.miniGalleryBadge}>
                                <MaterialCommunityIcons name="image-multiple" size={12} color="#FFF" />
                                <Text style={styles.galleryCountBadge}>+{item.photos.length}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>

        {/* Botão de Excluir Discreto */}
        <TouchableOpacity style={styles.deleteBtnCard} onPress={() => handleDelete(item.id)}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#B0BEC5" />
        </TouchableOpacity>
    </View>
  );

  if (!land) {
    return (
      <View style={styles.center}>
        <Text>Carregando terreno...</Text>
      </View>
    );
  }

  const logs = land.logs || [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header Customizado */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
            <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Diário de Campo</Text>
        <View style={{ width: 38 }} /> 
      </View>

      {/* Info do Terreno */}
      <View style={styles.landInfo}>
        <Text style={styles.landName}>{land.name}</Text>
        <Text style={styles.landStats}>{logs.length} registros • {logs.length > 0 ? 'Último em ' + new Date(logs[0].date).toLocaleDateString() : 'Nenhum registro'}</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="notebook-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>Nenhum registro ainda.</Text>
            <Text style={styles.emptySub}>Toque no + para adicionar fotos e anotações.</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push({ pathname: '/monitor/new', params: { landId: land.id } })}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0'
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  landInfo: { padding: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginBottom: 10 },
  landName: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  landStats: { fontSize: 13, color: '#888', marginTop: 2 },
  
  listContent: { padding: 15, paddingBottom: 100 },
  cardWrapper: { marginBottom: 15, position: 'relative' }, // Wrapper para posicionamento
  cardContent: { flex: 1 },
  
  card: { backgroundColor: '#FFF', borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  
  // Botão de Excluir Discreto
  deleteBtnCard: { position: 'absolute', top: 8, right: 8, padding: 4, zIndex: 10 },

  // Novo estilo lateral
  cardCoverSide: { width: 100, height: 100, borderRadius: 8, marginLeft: 10, marginTop: 10, backgroundColor: '#EEE' },
  cardBodySide: { flex: 1, padding: 12, justifyContent: 'center' },
  
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dateText: { fontSize: 11, color: '#999', marginLeft: 4, fontWeight: '600' },
  noteText: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  
  miniGalleryBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  galleryCountBadge: { color: '#FFF', fontSize: 10, marginLeft: 3, fontWeight: 'bold' },

  fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, color: '#888', marginTop: 15, fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: '#AAA', marginTop: 5 }
});

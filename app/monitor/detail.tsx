import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLands } from '../../src/context/LandsContext';
import { LandLog, LandPhoto } from '../../src/types';

const { width, height } = Dimensions.get('window');

export default function LogDetail() {
  const { landId, logId } = useLocalSearchParams<{ landId: string; logId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getLandById, deleteLog } = useLands();
  
  const [log, setLog] = useState<LandLog | null>(null);
  
  // Estados da Galeria
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (landId && logId) {
      const land = getLandById(landId);
      const foundLog = land?.logs?.find(l => l.id === logId);
      if (foundLog) {
        setLog(foundLog);
      }
    }
  }, [landId, logId, getLandById]);

  // Helpers de Data e Foto
  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) + 
           ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getSimpleDate = (isoDate: string) => {
      if (!isoDate) return 'Data desconhecida';
      return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // Normaliza todas as fotos em uma lista plana para o Carrossel
  const getAllPhotos = () => {
      if (!log || !log.photos) return [];
      return log.photos.map(p => typeof p === 'string' ? { uri: p, date: log.date } : p);
  };
  const allPhotos = getAllPhotos();

  const handleEdit = () => {
    router.push({ pathname: '/monitor/new', params: { landId, logId } });
  };

  const handleDelete = () => {
      Alert.alert(
          "Excluir Diário",
          "Tem certeza que deseja apagar este registro permanentemente?",
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Apagar", 
                  style: "destructive", 
                  onPress: async () => {
                      if (landId && logId) {
                          await deleteLog(landId, logId);
                          router.back();
                      }
                  }
              }
          ]
      );
  };

  const openViewer = (uri: string) => {
      const index = allPhotos.findIndex(p => p.uri === uri);
      if (index !== -1) {
          setCurrentPhotoIndex(index);
          setViewerVisible(true);
      }
  };

  // Agrupamento para a visualização da página (mantido)
  const getPhotoGroups = () => {
      if (!allPhotos || allPhotos.length === 0) return null;
      const groups: { date: string, photos: LandPhoto[] }[] = [];
      const tempMap: { [key: string]: LandPhoto[] } = {};

      allPhotos.forEach(item => {
          const dateKey = getSimpleDate(item.date);
          if (!tempMap[dateKey]) tempMap[dateKey] = [];
          tempMap[dateKey].push(item);
      });

      Object.keys(tempMap).forEach(key => {
          groups.push({ date: key, photos: tempMap[key] });
      });
      return groups;
  };
  const photoGroups = getPhotoGroups();

  // Scroll da Galeria
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentPhotoIndex(viewableItems[0].index);
    }
  }).current;

  if (!log) {
    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
            </View>
            <View style={styles.center}><Text>Carregando...</Text></View>
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Diário</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={handleDelete} style={styles.editBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF5252" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
                <MaterialCommunityIcons name="pencil" size={24} color="#2E7D32" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Capa Grande */}
        {log.coverPhoto && (
            <TouchableOpacity onPress={() => openViewer(log.coverPhoto!)}>
                <Image source={{ uri: log.coverPhoto }} style={styles.heroImage} resizeMode="cover" />
            </TouchableOpacity>
        )}

        {/* Cabeçalho do Post */}
        <View style={styles.postHeader}>
            <Text style={styles.postTitle}>{log.title || 'Sem Título'}</Text>
            <View style={styles.dateContainer}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color="#666" />
                <Text style={styles.dateText}>Criado em: {formatDate(log.date)}</Text>
            </View>
        </View>

        {/* Anotação */}
        {log.note ? (
            <View style={styles.noteCard}>
                <Text style={styles.label}>OBSERVAÇÕES</Text>
                <Text style={styles.noteText}>{log.note}</Text>
            </View>
        ) : null}

        {/* Galeria Agrupada */}
        {photoGroups && photoGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                    <MaterialCommunityIcons name="image-outline" size={18} color="#2E7D32" />
                    <Text style={styles.groupTitle}>{group.date}</Text>
                </View>
                <View style={styles.photosGrid}>
                    {group.photos.map((photo, imgIndex) => (
                        <TouchableOpacity key={imgIndex} style={styles.imageWrapper} onPress={() => openViewer(photo.uri)}>
                            <Image source={{ uri: photo.uri }} style={styles.fullImage} resizeMode="cover" />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        ))}
      </ScrollView>

      {/* GALERIA FULL SCREEN */}
      <Modal visible={viewerVisible} transparent={true} animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerContainer}>
            <StatusBar style="light" />
            
            {/* Header Flutuante da Galeria */}
            <View style={[styles.viewerHeader, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.closeViewerBtn}>
                    <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.viewerInfo}>
                    <Text style={styles.viewerDate}>
                        {allPhotos.length > 0 ? getSimpleDate(allPhotos[currentPhotoIndex].date) : ''}
                    </Text>
                    <Text style={styles.viewerCounter}>
                        {currentPhotoIndex + 1} de {allPhotos.length}
                    </Text>
                </View>
                <View style={{ width: 40 }} /> 
            </View>

            {/* Carrossel */}
            <FlatList
                ref={flatListRef}
                data={allPhotos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                initialScrollIndex={currentPhotoIndex}
                onScrollToIndexFailed={() => {}} // Previne erro se o layout não estiver pronto
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                renderItem={({ item }) => (
                    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                        <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    </View>
                )}
            />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEE', zIndex: 10
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  backBtn: { padding: 5 },
  editBtn: { padding: 5 },
  
  scroll: { paddingBottom: 40 },
  
  heroImage: { width: '100%', aspectRatio: 1, backgroundColor: '#F0F0F0', marginBottom: 20 },
  
  postHeader: { paddingHorizontal: 20, marginBottom: 20 },
  postTitle: { fontSize: 26, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 14, color: '#666', marginLeft: 6 },
  
  noteCard: { backgroundColor: '#F9F9F9', marginHorizontal: 20, padding: 20, borderRadius: 12, marginBottom: 25 },
  label: { fontSize: 12, fontWeight: '900', color: '#999', marginBottom: 15, letterSpacing: 1 },
  noteText: { fontSize: 18, color: '#333', lineHeight: 28 },
  
  // Estilos de Grupo
  groupSection: { marginBottom: 25, paddingHorizontal: 20 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  groupTitle: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  
  imageWrapper: { width: '31%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#EEE' },
  fullImage: { width: '100%', height: '100%' },

  // Viewer Full Screen
  viewerContainer: { flex: 1, backgroundColor: '#000' },
  viewerHeader: { 
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingBottom: 15 
  },
  closeViewerBtn: { padding: 5 },
  viewerInfo: { alignItems: 'center' },
  viewerDate: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  viewerCounter: { color: '#CCC', fontSize: 12, marginTop: 2 },
});
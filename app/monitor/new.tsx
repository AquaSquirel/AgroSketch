import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLands } from '../../src/context/LandsContext';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LandLog, LandPhoto } from '../../src/types';

export default function NewLog() {
  const { landId, logId } = useLocalSearchParams<{ landId: string; logId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addLog, updateLog, getLandById } = useLands();
  
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  
  // O estado photos agora pode conter objetos ou strings (legado)
  const [photos, setPhotos] = useState<(LandPhoto | string)[]>([]);
  const [saving, setSaving] = useState(false);

  // Helper para obter URI segura
  const getUri = (item: LandPhoto | string) => typeof item === 'string' ? item : item.uri;

  // Carregar dados se for edição
  useEffect(() => {
    if (landId && logId) {
        const land = getLandById(landId);
        const log = land?.logs?.find(l => l.id === logId);
        if (log) {
            setTitle(log.title || '');
            setNote(log.note || '');
            setCoverPhoto(log.coverPhoto || null);
            setPhotos(log.photos || []);
        }
    }
  }, [landId, logId]);

  const pickCover = async () => {
    Alert.alert(
      'Foto de Capa',
      'Escolha como deseja adicionar a foto:',
      [
        {
          text: 'Tirar Foto',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.status !== 'granted') return;
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              quality: 0.8,
              allowsEditing: true, 
              aspect: [1, 1], 
            });
            if (!result.canceled) setCoverPhoto(result.assets[0].uri);
          }
        },
        {
          text: 'Escolher da Galeria',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              quality: 0.8,
              allowsEditing: true, 
              aspect: [1, 1], 
            });
            if (!result.canceled) setCoverPhoto(result.assets[0].uri);
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const pickImages = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.7,
        allowsMultipleSelection: true, 
      });
    }

    if (!result.canceled) {
      // Cria objetos LandPhoto com a data atual
      const newItems: LandPhoto[] = result.assets.map(asset => ({
          uri: asset.uri,
          date: new Date().toISOString()
      }));
      setPhotos([...photos, ...newItems]);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos(photos.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Dê um título para o seu registro.');
      return;
    }

    setSaving(true);
    try {
      const logData: LandLog = {
        id: logId || Date.now().toString(),
        date: new Date().toISOString(),
        title: title.trim(),
        coverPhoto: coverPhoto || undefined,
        note: note.trim(),
        photos: photos,
      };

      if (landId) {
        if (logId) {
            await updateLog(landId, logData);
        } else {
            await addLog(landId, logData);
        }
        router.back();
      } else {
        Alert.alert("Erro", "ID do terreno não encontrado.");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar o registro.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header Customizado */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{logId ? 'Editar Diário' : 'Novo Diário'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveHeaderBtn}>
            {saving ? <ActivityIndicator size="small" color="#2E7D32" /> : <Text style={styles.saveHeaderText}>{logId ? 'Atualizar' : 'Salvar'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Seção de Capa */}
        <TouchableOpacity style={styles.coverContainer} onPress={pickCover}>
            {coverPhoto ? (
                <>
                    <Image source={{ uri: coverPhoto }} style={styles.coverImage} />
                    <View style={styles.editCoverBadge}>
                        <MaterialCommunityIcons name="camera-retake" size={20} color="#FFF" />
                    </View>
                </>
            ) : (
                <View style={styles.placeholderCover}>
                    <MaterialCommunityIcons name="image-plus" size={40} color="#CCC" />
                    <Text style={styles.coverText}>Adicionar Capa</Text>
                </View>
            )}
        </TouchableOpacity>

        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.inputTitle}
          placeholder="Ex: Visita Semanal, Praga Identificada..."
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Anotações</Text>
        <TextInput
          style={styles.inputNote}
          placeholder="Descreva o que foi observado..."
          multiline
          textAlignVertical="top"
          value={note}
          onChangeText={setNote}
        />

        <Text style={styles.label}>Galeria ({photos.length})</Text>
        <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => pickImages(true)}>
                <MaterialCommunityIcons name="camera" size={24} color="#2E7D32" />
                <Text style={styles.actionText}>Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => pickImages(false)}>
                <MaterialCommunityIcons name="image-multiple" size={24} color="#2E7D32" />
                <Text style={styles.actionText}>Galeria</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.photosGrid}>
            {photos.map((item, index) => (
                <View key={index} style={styles.photoWrapper}>
                    <Image source={{ uri: getUri(item) }} style={styles.photo} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
                        <MaterialCommunityIcons name="close" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEE'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  backBtn: { padding: 5 },
  saveHeaderBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#E8F5E9', borderRadius: 20 },
  saveHeaderText: { color: '#2E7D32', fontWeight: 'bold' },

  scroll: { padding: 20 },
  
  // Capa (Quadrada)
  coverContainer: { width: 200, height: 200, alignSelf: 'center', borderRadius: 12, overflow: 'hidden', marginBottom: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed', justifyContent: 'center' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' }, // Cover preenche o quadrado
  placeholderCover: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverText: { color: '#999', marginTop: 10, fontWeight: '600' },
  editCoverBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },

  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 5 },
  inputTitle: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 15, fontSize: 18, fontWeight: 'bold', marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
  inputNote: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 15, height: 120, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
  
  buttonRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9', elevation: 1 },
  actionText: { marginLeft: 8, color: '#2E7D32', fontWeight: 'bold' },
  
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrapper: { position: 'relative', width: '30%', aspectRatio: 1 },
  photo: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#EEE' },
  removeBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FF5252', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', elevation: 2 },
});
import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import MapView, { Polygon, Polyline, Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useLands } from '../../src/context/LandsContext';
import { Coordinate } from '../../src/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ExperimentResultScreen() {
  const { landId } = useLocalSearchParams<{ landId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { getLandById } = useLands();

  const land = getLandById(landId || '');
  const experiment = land?.experimentDraft;

  const isValid = land && experiment && experiment.blocks && experiment.blocks.length > 0;

  useEffect(() => {
    if (isValid && mapRef.current) {
        setTimeout(() => {
            let allPoints = [...land.coordinates];
            experiment.blocks.forEach(b => { 
                if(b.coordinates) allPoints = [...allPoints, ...b.coordinates]; 
            });
            
            mapRef.current?.fitToCoordinates(allPoints, {
                edgePadding: { top: 100, right: 30, bottom: SCREEN_HEIGHT * 0.35, left: 30 },
                animated: true,
            });
        }, 500);
    }
  }, [isValid]);

  const getBlockCenter = (coords: Coordinate[]) => {
      if (!coords || coords.length === 0) return { latitude: 0, longitude: 0 };
      const len = coords.length;
      return { latitude: coords.reduce((s, c) => s + c.latitude, 0) / len, longitude: coords.reduce((s, c) => s + c.longitude, 0) / len };
  };

  if (!isValid) {
      return (
          <View style={styles.center}>
              <Text>Dados do experimento não encontrados.</Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}><Text>Voltar</Text></TouchableOpacity>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* MAPA EM TELA CHEIA (POR TRÁS) */}
      <MapView
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="satellite"
        rotateEnabled={true}
      >
        {/* TERRENO */}
        <Polygon 
            coordinates={land.coordinates} 
            strokeColor="rgba(255,255,255,0.8)" 
            fillColor="rgba(0,0,0,0.3)" 
            strokeWidth={2} 
            zIndex={1}
        />

        {/* BLOCOS E LINHAS */}
        {experiment.blocks.map((block) => (
            <React.Fragment key={`block-group-${block.id}`}>
                {/* Linhas de Plantio */}
                {block.internalLines && block.internalLines.map((line, lineIndex) => {
                        if(!line.coordinates || line.coordinates.length < 2) return null;
                        return (
                        <React.Fragment key={`line-${block.id}-${lineIndex}`}>
                            <Polyline 
                                coordinates={line.coordinates} 
                                strokeColor={line.color} 
                                strokeWidth={3} 
                                zIndex={20} 
                                lineCap="round"
                            />
                            {/* Ponto inicial para identificar direção */}
                            <Circle 
                                center={line.coordinates[0]} 
                                radius={0.3} 
                                fillColor="#FFF" 
                                zIndex={21} 
                            />
                        </React.Fragment>
                    )
                })}
            </React.Fragment>
        ))}

        {/* NUMERAÇÃO DOS BLOCOS */}
        {experiment.blocks.map((block, index) => {
            const center = getBlockCenter(block.coordinates);
            return (
                <Marker 
                    key={`label-${block.id}`}
                    coordinate={center} 
                    anchor={{x: 0.5, y: 0.5}}
                    zIndex={30}
                    tracksViewChanges={false}
                >
                    <View style={styles.blockLabelContainer}>
                        <Text style={styles.blockLabelText}>{index + 1}</Text>
                    </View>
                </Marker>
            );
        })}
      </MapView>

      {/* BOTÃO VOLTAR (PARA A LISTA) */}
      <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 10 }]}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      {/* BOTÃO EDITAR (PARA SETUP) */}
      <TouchableOpacity 
        onPress={() => router.push('/experiment')} 
        style={[styles.editBtn, { top: insets.top + 10 }]}
      >
        <MaterialCommunityIcons name="pencil" size={20} color="#FFF" />
        <Text style={styles.editText}>Editar</Text>
      </TouchableOpacity>

      {/* PAINEL DE LEGENDA E INFORMAÇÕES */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        
        <Text style={styles.sheetTitle}>Resultado do Experimento</Text>
        
        <View style={styles.statsRow}>
            <View style={styles.statItem}>
                <Text style={styles.statValue}>{experiment.blocks.length}</Text>
                <Text style={styles.statLabel}>Blocos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
                <Text style={styles.statValue}>{experiment.rotation}°</Text>
                <Text style={styles.statLabel}>Rotação</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
                <Text style={styles.statValue}>{experiment.species.length}</Text>
                <Text style={styles.statLabel}>Tratamentos</Text>
            </View>
        </View>

        <Text style={styles.legendTitle}>LEGENDA DOS TRATAMENTOS</Text>
        <ScrollView style={styles.legendScroll} showsVerticalScrollIndicator={false}>
            {experiment.species.map((s, index) => (
                <View key={s.id} style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: s.color }]} />
                    <Text style={styles.legendName}>{index + 1}. {s.name}</Text>
                </View>
            ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  backBtn: { 
      position: 'absolute', left: 20, 
      backgroundColor: '#FFF', width: 44, height: 44, borderRadius: 22, 
      alignItems: 'center', justifyContent: 'center', elevation: 5, zIndex: 100 
  },

  editBtn: {
      position: 'absolute', right: 20,
      backgroundColor: '#2E7D32', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25,
      flexDirection: 'row', alignItems: 'center', elevation: 5, zIndex: 100
  },
  editText: { fontWeight: 'bold', color: '#FFF', marginLeft: 8 },

  blockLabelContainer: { backgroundColor: 'rgba(255,255,255,0.95)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000', elevation: 2 },
  blockLabelText: { fontWeight: '900', fontSize: 14, color: '#000' },

  bottomSheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, height: '35%', elevation: 20,
      shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 5
  },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 15 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20, backgroundColor: '#F5F5F5', padding: 10, borderRadius: 12 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#2E7D32' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: 20, backgroundColor: '#DDD' },

  legendTitle: { fontSize: 12, fontWeight: 'bold', color: '#999', letterSpacing: 1, marginBottom: 10 },
  legendScroll: { flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 5 },
  legendColor: { width: 24, height: 24, borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  legendName: { fontSize: 16, color: '#333', fontWeight: '500' },
});

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, 
    KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator
} from 'react-native';
import MapView, { Polygon, Polyline, Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

// Imports locais
import { Species, ExperimentBlock, Coordinate } from '../types';
import { generateSmartExperiment, findBestExperimentConfig } from '../utils/experimentLogic';
import { useLands } from '../context/LandsContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const HIGH_CONTRAST_COLORS = ['#FF4500', '#00FFFF', '#FFD700', '#4169E1', '#32CD32', '#FF00FF', '#FFFFFF'];

export default function ExperimentSetupScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { selectedLand: land, saveExperimentDraft } = useLands();

  // Estados
  const [rowLengthStr, setRowLengthStr] = useState('5');
  const [rowSpacingStr, setRowSpacingStr] = useState('50');
  const [alleyWidthStr, setAlleyWidthStr] = useState('1.5');
  const [rotationOffset, setRotationOffset] = useState(0); 
  
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [generatedBlocks, setGeneratedBlocks] = useState<ExperimentBlock[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Controle de Expandir Mapa
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const isValidLand = land && land.coordinates && land.coordinates.length > 0;

  // Carregar rascunho
  useEffect(() => {
    if (land?.experimentDraft) {
        const d = land.experimentDraft;
        setRowLengthStr(d.rowLength);
        setRowSpacingStr(d.rowSpacing);
        setAlleyWidthStr(d.alleyWidth);
        setRotationOffset(d.rotation);
        setSpeciesList(d.species);
        setGeneratedBlocks(d.blocks);
    }
  }, [land]);

  // Zoom no Mapa
  useEffect(() => {
    if (isValidLand && mapRef.current) {
        setTimeout(() => {
            mapRef.current?.fitToCoordinates(land.coordinates, {
                edgePadding: { top: 60, right: 30, bottom: 20, left: 30 },
                animated: true,
            });
        }, 500);
    }
  }, [isValidLand, isMapExpanded]); // Reajusta ao expandir

  // Auto-Save
  useEffect(() => {
    if (land && isValidLand) {
        const timeout = setTimeout(() => {
            const draftData = {
                rowLength: rowLengthStr,
                rowSpacing: rowSpacingStr,
                alleyWidth: alleyWidthStr,
                rotation: rotationOffset,
                species: speciesList,
                blocks: generatedBlocks || []
            };
            saveExperimentDraft(land.id, draftData);
        }, 800);
        return () => clearTimeout(timeout);
    }
  }, [rowLengthStr, rowSpacingStr, alleyWidthStr, rotationOffset, speciesList, generatedBlocks]);

  const handleGenerate = useCallback(() => {
    if (!isValidLand) return;
    if (speciesList.length < 2) { Alert.alert("Atenção", "Adicione pelo menos 2 tratamentos."); return; }
    
    const rLen = parseFloat(rowLengthStr.replace(',', '.'));
    const rSpaceCm = parseFloat(rowSpacingStr.replace(',', '.'));
    const alley = parseFloat(alleyWidthStr.replace(',', '.'));

    if (!rLen || !rSpaceCm || isNaN(alley)) { Alert.alert("Erro", "Verifique dimensões."); return; }

    setIsProcessing(true);

    setTimeout(() => {
        try {
            const result = findBestExperimentConfig(land.coordinates, {
                rowLength: rLen,
                rowSpacing: rSpaceCm,
                alleyWidth: alley,
                species: speciesList,
                rotationOffset: rotationOffset 
            });

            if (result.blocks.length === 0) {
                Alert.alert("Ops", "Nenhum bloco coube. Tente reduzir o tamanho.");
            } else {
                setGeneratedBlocks(result.blocks);
                setRotationOffset(result.bestAngle);
                
                if (mapRef.current) {
                    let allPoints = [...land.coordinates];
                    result.blocks.forEach(b => { if(b.coordinates) allPoints = [...allPoints, ...b.coordinates]; });
                    mapRef.current.fitToCoordinates(allPoints, {
                        edgePadding: { top: 60, right: 30, bottom: 20, left: 30 },
                        animated: true,
                    });
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Erro", "Falha ao calcular.");
        } finally {
            setIsProcessing(false);
        }
    }, 100);
  }, [land, rowLengthStr, rowSpacingStr, alleyWidthStr, speciesList, rotationOffset]);

  const handleConfirm = async () => {
    if (land && generatedBlocks) {
        const draftData = {
            rowLength: rowLengthStr,
            rowSpacing: rowSpacingStr,
            alleyWidth: alleyWidthStr,
            rotation: rotationOffset,
            species: speciesList,
            blocks: generatedBlocks
        };
        await saveExperimentDraft(land.id, draftData);
        // Usa replace para que o botão 'Voltar' da próxima tela vá para a Lista, não para cá
        router.replace({ pathname: '/experiment/result', params: { landId: land.id } });
    }
  };

  // Funções Auxiliares
  const handleManualRotationChange = (newAngle: number) => {
      setRotationOffset(newAngle);
      if (speciesList.length >= 2) {
        const rLen = parseFloat(rowLengthStr.replace(',', '.'));
        const rSpaceCm = parseFloat(rowSpacingStr.replace(',', '.'));
        const alley = parseFloat(alleyWidthStr.replace(',', '.'));
        const blocks = generateSmartExperiment(land.coordinates, {
            rowLength: rLen, rowSpacing: rSpaceCm, alleyWidth: alley, species: speciesList,
            rotationOffset: newAngle
        });
        setGeneratedBlocks(blocks);
      }
  };

  const handleAddSpecies = () => {
    if (!newSpeciesName.trim()) return;
    const usedColors = new Set(speciesList.map(s => s.color));
    let nextColor = HIGH_CONTRAST_COLORS.find(c => !usedColors.has(c));
    if (!nextColor) {
        const nextColorIndex = speciesList.length % HIGH_CONTRAST_COLORS.length;
        nextColor = HIGH_CONTRAST_COLORS[nextColorIndex];
    }
    setSpeciesList([...speciesList, { id: Date.now().toString(), name: newSpeciesName.trim(), color: nextColor }]);
    setNewSpeciesName('');
  };
  const handleRemoveSpecies = (id: string) => setSpeciesList(speciesList.filter(s => s.id !== id));
  const rotateLeft = () => handleManualRotationChange(Math.round(rotationOffset - 1));
  const rotateRight = () => handleManualRotationChange(Math.round(rotationOffset + 1));

  if (!isValidLand) return <View style={styles.centerContainer}><Text>Sem terreno selecionado.</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* 1. SEÇÃO MAPA (TOPO) */}
      <View style={[styles.mapContainer, { height: isMapExpanded ? '100%' : '42%' }]}>
        <MapView
            provider={PROVIDER_GOOGLE}
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            mapType="satellite"
            rotateEnabled={true}
        >
            <Polygon 
                coordinates={land.coordinates} 
                strokeColor="rgba(255,255,255,0.6)" 
                fillColor="rgba(0,0,0,0.5)" 
                strokeWidth={2} 
                zIndex={1}
            />
            {generatedBlocks && generatedBlocks.map((block) => (
                <Polygon 
                    key={`block-poly-${block.id}`}
                    coordinates={block.coordinates} 
                    fillColor="rgba(0, 0, 0, 0)" 
                    strokeColor="#FFFFFF"
                    strokeWidth={1} 
                    zIndex={10}
                />
            ))}
            {/* 3. LINHAS (PREVIEW IDÊNTICO AO FINAL) */}
            {generatedBlocks && generatedBlocks.map((block) => (
                <React.Fragment key={`lines-group-${block.id}`}>
                    {block.internalLines && block.internalLines.map((line, lineIndex) => {
                         if(!line.coordinates || line.coordinates.length < 2) return null;
                         return (
                            <React.Fragment key={`line-${block.id}-${lineIndex}`}>
                                <Polyline 
                                    coordinates={line.coordinates} 
                                    strokeColor={line.color} 
                                    strokeWidth={3} // Igual ao resultado final
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
        </MapView>

        {isProcessing && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.loadingText}>Processando...</Text>
            </View>
        )}

        <TouchableOpacity onPress={() => router.back()} style={[styles.floatingBtn, { top: insets.top + 10, left: 20 }]}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {/* Botão para Expandir/Recolher Mapa */}
        <TouchableOpacity 
            onPress={() => setIsMapExpanded(!isMapExpanded)} 
            style={[styles.floatingBtn, { bottom: 20, right: 20 }]}
        >
            <MaterialCommunityIcons name={isMapExpanded ? "arrow-collapse" : "arrow-expand"} size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 2. SEÇÃO CONTROLES (BAIXO) - Oculta se expandido */}
      {!isMapExpanded && (
        <View style={styles.controlsContainer}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.controlsHeader}>
                        <Text style={styles.sheetTitle}>Configurar Experimento</Text>
                        <View style={styles.miniRotationControl}>
                            <TouchableOpacity style={styles.miniRotBtn} onPress={rotateLeft}><MaterialCommunityIcons name="rotate-left" size={22} color="#333" /></TouchableOpacity>
                            <Text style={styles.rotValue}>{rotationOffset}°</Text>
                            <TouchableOpacity style={styles.miniRotBtn} onPress={rotateRight}><MaterialCommunityIcons name="rotate-right" size={22} color="#333" /></TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputRow}>
                        <View style={styles.inputCol}><Text style={styles.labelCompact}>Comp. Linha (m)</Text><TextInput style={styles.compactInput} keyboardType="numeric" value={rowLengthStr} onChangeText={setRowLengthStr} /></View>
                        <View style={styles.inputCol}><Text style={styles.labelCompact}>Entre Linhas (cm)</Text><TextInput style={styles.compactInput} keyboardType="numeric" value={rowSpacingStr} onChangeText={setRowSpacingStr} /></View>
                        <View style={styles.inputCol}><Text style={styles.labelCompact}>Corredor (m)</Text><TextInput style={styles.compactInput} keyboardType="numeric" value={alleyWidthStr} onChangeText={setAlleyWidthStr} /></View>
                    </View>

                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Tratamentos ({speciesList.length})</Text>
                        <View style={styles.addSpeciesRow}>
                            <TextInput style={styles.addInput} placeholder="Nome..." value={newSpeciesName} onChangeText={setNewSpeciesName} onSubmitEditing={handleAddSpecies} />
                            <TouchableOpacity style={styles.addBtn} onPress={handleAddSpecies}><MaterialCommunityIcons name="plus" size={28} color="#FFF" /></TouchableOpacity>
                        </View>
                        <View style={styles.speciesList}>
                            {speciesList.map((item, index) => (
                                <View key={item.id} style={styles.speciesChip}>
                                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                    <Text style={styles.speciesName}>{index + 1}. {item.name}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveSpecies(item.id)} style={styles.removeIcon}><Ionicons name="close" size={14} color="#FFF" /></TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
                        <MaterialCommunityIcons name="checkerboard" size={24} color="#FFF" style={{ marginRight: 10 }} />
                        <Text style={styles.generateBtnTxt}>GERAR PREVIEW</Text>
                    </TouchableOpacity>

                    {generatedBlocks && (
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <MaterialCommunityIcons name="check-bold" size={24} color="#FFF" style={{ marginRight: 10 }} />
                            <Text style={styles.generateBtnTxt}>CONFIRMAR E SALVAR</Text>
                        </TouchableOpacity>
                    )}
                    <View style={{height: 40}} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  
  // Layout
  mapContainer: { width: '100%', position: 'relative' },
  controlsContainer: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, paddingHorizontal: 20, elevation: 15, zIndex: 5 },
  
  // Botões Flutuantes
  floatingBtn: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.9)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 100 },
  
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 200 },
  loadingText: { color: '#FFF', marginTop: 10, fontWeight: 'bold' },

  // Scroll Content
  scrollContent: { paddingTop: 25 },
  
  controlsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  
  miniRotationControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, padding: 4 },
  miniRotBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  rotValue: { marginHorizontal: 8, fontWeight: 'bold', color: '#555', minWidth: 30, textAlign: 'center' },
  
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
  inputCol: { flex: 1 },
  compactInput: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 5, fontSize: 16, textAlign: 'center', color: '#333', fontWeight: 'bold' },
  labelCompact: { fontSize: 11, color: '#666', marginBottom: 5, fontWeight: '600', textAlign: 'center' },
  
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  
  addSpeciesRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  addInput: { flex: 1, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15, height: 50, fontSize: 15 },
  addBtn: { width: 50, height: 50, backgroundColor: '#2E7D32', borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  
  speciesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speciesChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingLeft: 6, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: '#EEE', elevation: 1 },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  speciesName: { fontSize: 13, color: '#333', marginRight: 8, fontWeight: '600' },
  removeIcon: { backgroundColor: '#FF5252', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  generateBtn: { flexDirection: 'row', backgroundColor: '#546E7A', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2, marginTop: 10 },
  confirmBtn: { flexDirection: 'row', backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 6, marginTop: 15, marginBottom: 10 },
  generateBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
});

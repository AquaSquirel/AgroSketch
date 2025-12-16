import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Modal, TextInput, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Polygon, Marker, Region } from 'react-native-maps';
import ViewShot from "react-native-view-shot";
import * as turf from '@turf/turf';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Coordinate, SavedLand, PRESETS_CULTURAS } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar'; // <--- Importe isso junto com os outros
interface MapEditorProps {
  onBack: () => void;
  onSave: (land: SavedLand) => void;
  initialLand: SavedLand | null;
}

const getRegionForCoordinates = (points: Coordinate[]) => {
  if (!points.length) return null;
  let minLat = points[0].latitude, maxLat = points[0].latitude;
  let minLng = points[0].longitude, maxLng = points[0].longitude;
  points.forEach(point => {
    minLat = Math.min(minLat, point.latitude); maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude); maxLng = Math.max(maxLng, point.longitude);
  });
  const midLat = (minLat + maxLat) / 2, midLng = (minLng + maxLng) / 2;
  const deltaLat = (maxLat - minLat), deltaLng = (maxLng - minLng);
  return {
    latitude: midLat, longitude: midLng,
    latitudeDelta: deltaLat * 1.8, longitudeDelta: deltaLng * 1.8,
    height: deltaLat, width: deltaLng
  };
};

export default function MapEditor({ onBack, onSave, initialLand }: MapEditorProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [area, setArea] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [initialRegion, setInitialRegion] = useState<Region>({
    latitude: -23.5015, longitude: -47.4521,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchLat, setSearchLat] = useState('');
  const [searchLng, setSearchLng] = useState('');

  const [espacamentoLinha, setEspacamentoLinha] = useState('');
  const [espacamentoPlanta, setEspacamentoPlanta] = useState('');
  const [resultadoPlantas, setResultadoPlantas] = useState<number | null>(null);
  const [metrosLineares, setMetrosLineares] = useState<number | null>(null);
  const [landName, setLandName] = useState('');

  // --- EFEITO: LOCALIZAÇÃO DO USUÁRIO ---
  useEffect(() => {
    const loadUserLocation = async () => {
      if (initialLand) return;
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        mapRef.current?.animateCamera({
          center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
          zoom: 17
        });
      } catch (error) { console.log("Erro GPS:", error); }
    };
    loadUserLocation();
  }, [initialLand]);

  // --- EFEITO: CARREGAR TERRENO SALVO ---
  useEffect(() => {
    if (initialLand) {
      setCoordinates(initialLand.coordinates);
      setArea(initialLand.area);
      setTimeout(() => {
        const region = getRegionForCoordinates(initialLand.coordinates);
        if (region) mapRef.current?.animateCamera({ center: region, zoom: 16 });
      }, 500);
    }
  }, [initialLand]);

  const addPointAtCenter = async () => {
    const { width, height } = Dimensions.get('window');
    const point = { x: width / 2, y: height / 2 };
    const coordinate = await mapRef.current?.coordinateForPoint(point);
    if (coordinate) {
      const newC = [...coordinates, coordinate];
      setCoordinates(newC);
      if (newC.length >= 3) calculateArea(newC);
    }
  };

  const calculateArea = (coords: Coordinate[]) => {
    try {
      const tCoords = coords.map(c => [c.longitude, c.latitude]);
      tCoords.push(tCoords[0]);
      const polygon = turf.polygon([tCoords]);
      setArea(turf.area(polygon));
      setResultadoPlantas(null); setMetrosLineares(null);
    } catch (e) { console.log(e); }
  };

  const handleDragEnd = (index: number, newCoord: Coordinate) => {
    const newC = [...coordinates]; newC[index] = newCoord; setCoordinates(newC);
    if (newC.length >= 3) calculateArea(newC);
  };

  const clearMap = () => {
    setCoordinates([]); setArea(0); setResultadoPlantas(null); setMetrosLineares(null);
  };

  const handleSearchLocation = () => {
    const lat = parseFloat(searchLat.replace(',', '.'));
    const lng = parseFloat(searchLng.replace(',', '.'));
    if (isNaN(lat) || isNaN(lng)) { Alert.alert("Erro", "Coordenadas inválidas"); return; }
    setSearchModalVisible(false); Keyboard.dismiss();
    mapRef.current?.animateCamera({ center: { latitude: lat, longitude: lng }, zoom: 18 });
  };

  const generatePDF = async () => {
    if (coordinates.length < 3) { Alert.alert("Atenção", "Desenhe uma área."); return; }
    setLoadingPdf(true);
    try {
      const currentCamera = await mapRef.current?.getCamera();
      const region = getRegionForCoordinates(coordinates);
      if (region) {
        const isPortrait = region.height > region.width;
        const targetHeading = isPortrait ? 0 : 90;
        const fitOptions: any = { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true, heading: targetHeading };
        mapRef.current?.fitToCoordinates(coordinates, fitOptions);
        await new Promise(r => setTimeout(r, 2500));
      }
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error("Falha captura");
      if (currentCamera) mapRef.current?.setCamera(currentCamera);

      const date = new Date().toLocaleDateString('pt-BR');
      const areaFmt = area > 10000 ? `${(area / 10000).toFixed(2)} hectares` : `${area.toFixed(2)} m²`;
      const estPlantas = resultadoPlantas ? `${resultadoPlantas.toLocaleString('pt-BR')} mudas` : "Não calculado";
      const metrosTxt = metrosLineares ? `${metrosLineares.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} metros` : "N/A";
      const espacoTxt = resultadoPlantas ? `${espacamentoLinha}cm x ${espacamentoPlanta}cm` : "N/A";

      const html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/><style>@page{margin:20px;size:A4 portrait}body{font-family:'Helvetica',sans-serif;text-align:center;-webkit-print-color-adjust:exact}.map-container{position:relative;width:100%;max-width:650px;height:450px;border:2px solid #2E7D32;border-radius:8px;overflow:hidden;margin:0 auto 20px auto;background:#f0f0f0;display:flex;align-items:center;justify-content:center}.rotated-img{position:absolute;top:50%;left:50%;width:450px;height:650px;object-fit:contain;transform:translate(-50%,-50%) rotate(-90deg)}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#E8F5E9;color:#2E7D32}</style></head><body><h1 style="color:#2E7D32">Relatório Agrícola</h1><p style="color:#666">Gerado em: ${date}</p><div class="map-container"><img src="${uri}" class="rotated-img"/></div><table><tr><th>Parâmetro</th><th>Valor</th></tr><tr><td><strong>Área Total</strong></td><td>${areaFmt}</td></tr><tr><td><strong>Estimativa Plantio</strong></td><td>${estPlantas}</td></tr><tr><td><strong>Metros Lineares</strong></td><td>${metrosTxt}</td></tr><tr><td><strong>Espaçamento</strong></td><td>${espacoTxt}</td></tr></table><p style="margin-top:30px;font-size:10px;color:#999">AgroSketch Pro</p></body></html>`;
      const { uri: pdfUri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(pdfUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) { Alert.alert("Erro PDF"); } finally { setLoadingPdf(false); }
  };

  const handleSave = () => {
    if (!landName.trim()) { Alert.alert("Erro", "Nome inválido"); return; }
    const newLand: SavedLand = { id: initialLand?.id || Date.now().toString(), name: landName, coordinates, area, date: new Date().toLocaleDateString('pt-BR') };
    onSave(newLand); setSaveModalVisible(false); setLandName('');
  };

  const goToMyLocation = async () => {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') return;
    }
    let location = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateCamera({ center: { latitude: location.coords.latitude, longitude: location.coords.longitude }, zoom: 17 });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER: Ajustado para usar insets.top */}
      <View style={[styles.mapHeader, { top: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.mapTitle}>Editor de Terreno</Text>

        <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.backButton} onPress={goToMyLocation}>
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#0288D1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => setSearchModalVisible(true)}>
            <Ionicons name="search" size={24} color="#2E7D32" />
          </TouchableOpacity>
        </View>
      </View>

      <ViewShot ref={viewShotRef} style={{ flex: 1 }} options={{ result: "data-uri" }}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFillObject} mapType="satellite" initialRegion={initialRegion} showsUserLocation={true}>
          {coordinates.length > 0 && <Polygon coordinates={coordinates} strokeColor="#F00" fillColor="rgba(255,0,0,0.3)" strokeWidth={2} />}
          {coordinates.map((coord, index) => (
            <Marker key={index} coordinate={coord} draggable onDragEnd={(e) => handleDragEnd(index, e.nativeEvent.coordinate)} anchor={{ x: 0.5, y: 0.5 }} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                <View style={styles.markerPoint} />
              </View>
            </Marker>
          ))}
        </MapView>
      </ViewShot>

      <View style={styles.crosshair} pointerEvents="none"><View style={{ width: 2, height: 30, backgroundColor: 'white' }} /><View style={{ position: 'absolute', width: 30, height: 2, backgroundColor: 'white' }} /></View>

      {/* --- MUDANÇA PRINCIPAL AQUI --- */}
      <View style={[styles.infoPanel, { paddingBottom: 20 + insets.bottom }]}>
        
        {/* O BOTÃO AGORA FICA AQUI, SOLTO E ABSOLUTO */}
        <TouchableOpacity style={styles.fabFixed} onPress={addPointAtCenter}>
            <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
        </TouchableOpacity>

        {/* Informações de Texto (Sem o botão dentro) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <View>
            <Text style={styles.label}>Área Total</Text>
            <Text style={styles.value}>{area > 10000 ? `${(area / 10000).toFixed(2)} ha` : `${area.toFixed(2)} m²`}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actBtn} onPress={() => setModalVisible(true)}><MaterialCommunityIcons name="sprout" size={24} color="#2E7D32" /><Text style={styles.actTxt}>Plantio</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actBtn} onPress={() => setSaveModalVisible(true)}><MaterialCommunityIcons name="content-save" size={24} color="#7B1FA2" /><Text style={styles.actTxt}>Salvar</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actBtn} onPress={generatePDF}>{loadingPdf ? <ActivityIndicator color="#5D4037" /> : <MaterialCommunityIcons name="file-pdf-box" size={24} color="#5D4037" />}<Text style={styles.actTxt}>PDF</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#FFEBEE' }]} onPress={clearMap}><MaterialCommunityIcons name="trash-can" size={24} color="#D32F2F" /><Text style={[styles.actTxt, { color: '#D32F2F' }]}>Limpar</Text></TouchableOpacity>
        </View>
      </View>

      {/* MODAIS (Cópia exata do seu anterior) */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={styles.modalOverlay}><View style={styles.modalView}>
          <Text style={styles.modalTitle}>Calculadora</Text>
          <View style={{ height: 40, marginBottom: 15 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PRESETS_CULTURAS.map(c => (
                <TouchableOpacity key={c.id} style={styles.chip} onPress={() => { setEspacamentoLinha(c.linha); setEspacamentoPlanta(c.planta); Keyboard.dismiss(); }}>
                  <Text style={styles.chipTxt}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TextInput style={styles.input} placeholder="Linha (cm)" placeholderTextColor="#888" keyboardType="numeric" value={espacamentoLinha} onChangeText={setEspacamentoLinha} />
          <TextInput style={styles.input} placeholder="Planta (cm)" placeholderTextColor="#888" keyboardType="numeric" value={espacamentoPlanta} onChangeText={setEspacamentoPlanta} />
          {resultadoPlantas && (<View style={styles.resBox}><Text style={styles.resVal}>{resultadoPlantas.toLocaleString('pt-BR')} mudas</Text><Text style={styles.resSub}>{metrosLineares?.toLocaleString('pt-BR')} metros lineares</Text></View>)}
          <TouchableOpacity style={styles.btnPrimary} onPress={() => { const l = parseFloat(espacamentoLinha.replace(',', '.')), p = parseFloat(espacamentoPlanta.replace(',', '.')); if (l && p && area > 0) { const ml = area / (l / 100); setMetrosLineares(Math.floor(ml)); setResultadoPlantas(Math.floor(ml * (100 / p))); Keyboard.dismiss(); } }}><Text style={styles.btnTxt}>CALCULAR</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnClose} onPress={() => setModalVisible(false)}><Text style={styles.btnCloseTxt}>FECHAR</Text></TouchableOpacity>
        </View></View></TouchableWithoutFeedback>
      </Modal>

      <Modal visible={saveModalVisible} transparent animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={styles.modalOverlay}><View style={styles.modalView}>
          <Text style={styles.modalTitle}>Nome do Projeto</Text>
          <TextInput style={styles.input} placeholder="Ex: Piquet 1" placeholderTextColor="#888" value={landName} onChangeText={setLandName} />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}><Text style={styles.btnTxt}>SALVAR</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnClose} onPress={() => setSaveModalVisible(false)}><Text style={styles.btnCloseTxt}>CANCELAR</Text></TouchableOpacity>
        </View></View></TouchableWithoutFeedback>
      </Modal>

      <Modal visible={searchModalVisible} transparent animationType="fade" onRequestClose={() => setSearchModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}><View style={styles.modalOverlay}><View style={styles.modalView}>
          <Text style={styles.modalTitle}>Buscar Local</Text>
          <Text style={{ color: '#666', marginBottom: 10, textAlign: 'center' }}>Cole as coordenadas (Latitude e Longitude)</Text>
          <TextInput style={styles.input} placeholder="Latitude (Ex: -23.123)" placeholderTextColor="#888" keyboardType="numbers-and-punctuation" value={searchLat} onChangeText={setSearchLat} />
          <TextInput style={styles.input} placeholder="Longitude (Ex: -47.123)" placeholderTextColor="#888" keyboardType="numbers-and-punctuation" value={searchLng} onChangeText={setSearchLng} />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleSearchLocation}><Text style={styles.btnTxt}>IR PARA O LOCAL</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnClose} onPress={() => setSearchModalVisible(false)}><Text style={styles.btnCloseTxt}>CANCELAR</Text></TouchableOpacity>
        </View></View></TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mapHeader: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  backButton: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  mapTitle: { marginLeft: 15, fontSize: 18, fontWeight: 'bold', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  markerPoint: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'white', borderColor: 'red', borderWidth: 2 },
  crosshair: { position: 'absolute', top: '50%', left: '50%', marginTop: -15, marginLeft: -15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  infoPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 20 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
  value: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  
  // --- ESTILO NOVO DO BOTÃO FLUTUANTE ---
  fabFixed: {
    position: 'absolute',
    top: -27.5, // Metade da altura (55/2) para fora
    right: 20,
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    zIndex: 10,
  },

  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  actBtn: { alignItems: 'center', justifyContent: 'center', width: 70, height: 70, borderRadius: 15, backgroundColor: '#F5F5F5' },
  actTxt: { fontSize: 10, fontWeight: 'bold', color: '#555', marginTop: 5 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  chip: { backgroundColor: '#E8F5E9', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#C8E6C9' },
  chipTxt: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  input: { width: '100%', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#F9F9F9', marginBottom: 10, color: '#333' },
  btnPrimary: { backgroundColor: '#00C853', borderRadius: 12, padding: 15, width: '100%', marginTop: 10, alignItems: 'center' },
  btnTxt: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnClose: { marginTop: 15 },
  btnCloseTxt: { color: '#666', fontWeight: 'bold' },
  resBox: { marginTop: 10, padding: 15, backgroundColor: '#E8F5E9', borderRadius: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9' },
  resVal: { fontSize: 18, color: '#1B5E20', fontWeight: 'bold' },
  resSub: { fontSize: 12, color: '#4CAF50' },
});
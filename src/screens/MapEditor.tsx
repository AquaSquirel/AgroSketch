import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Modal, TextInput, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Polygon, Marker, Region } from 'react-native-maps';
import ViewShot from "react-native-view-shot";
import * as turf from '@turf/turf';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { Coordinate, SavedLand, PRESETS_CULTURAS } from '../types';
import { useLands } from '../context/LandsContext';

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

export default function MapEditor() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const { selectedLand: initialLand, saveLand } = useLands();

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
      setCoordinates(initialLand.coordinates || []); 
      setArea(initialLand.area || 0);
      setLandName(initialLand.name || '');
      
      // Focar no terreno existente
      setTimeout(() => {
        if (initialLand.coordinates && initialLand.coordinates.length > 0 && mapRef.current) {
            mapRef.current.fitToCoordinates(initialLand.coordinates, {
                edgePadding: { top: 100, right: 100, bottom: 250, left: 100 }, // Margem generosa para ver o entorno
                animated: true,
            });
        }
      }, 500); // Delay para garantir renderização do mapa
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

  const addPointAtUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permissão necessária", "Ative o GPS para marcar pontos andando.");
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const newCoord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const newC = [...coordinates, newCoord];
      setCoordinates(newC);
      if (newC.length >= 3) calculateArea(newC);

      // Feedback visual: centralizar levemente no novo ponto
      mapRef.current?.animateCamera({ center: newCoord, zoom: 18 });

    } catch (error) {
      Alert.alert("Erro GPS", "Não foi possível obter sua localização exata.");
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
    try {
      if (coordinates.length < 3) {
          Alert.alert("Erro", "Defina o terreno antes de gerar o PDF.");
          return;
      }

      setLoadingPdf(true);
      
      // 1. Calcular o Bounding Box (Extremos do terreno)
      let minLat = coordinates[0].latitude, maxLat = coordinates[0].latitude;
      let minLng = coordinates[0].longitude, maxLng = coordinates[0].longitude;
      
      coordinates.forEach(p => {
        minLat = Math.min(minLat, p.latitude); maxLat = Math.max(maxLat, p.latitude);
        minLng = Math.min(minLng, p.longitude); maxLng = Math.max(maxLng, p.longitude);
      });
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // 2. Calcular dimensões em "Metros" aproximados para descobrir a proporção REAL do desenho
      // Usamos turf se disponível, ou cálculo manual simples. 
      // A lógica abaixo garante que a imagem não distorça.
      
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      
      // Fator de correção da longitude baseado na latitude (Mercator)
      const cosLat = Math.cos(centerLat * (Math.PI / 180));
      
      // Margem de segurança (20% para não cortar os marcadores nas bordas)
      const PADDING = 1.2; 
      
      // Proporção Real do Terreno (Largura / Altura)
      const groundAspectRatio = (lngDiff * cosLat) / latDiff;

      // 3. Definir dimensões da imagem (Alta Resolução)
      const IMG_WIDTH = 1000;
      const IMG_HEIGHT = Math.round(IMG_WIDTH / groundAspectRatio);

      // 4. PREPARAÇÃO CRÍTICA DA REGIÃO
      // A região deve ter exata proporção dos pixels para não achatar.
      // Definimos o Delta baseado no que for maior (para caber tudo) e ajustamos o outro.
      
      let finalLatDelta = latDiff * PADDING;
      let finalLngDelta = finalLatDelta * groundAspectRatio; // Inicialmente segue a proporção

      // Se o cálculo da longitude ficar menor que o terreno real (caso raro de terreno muito largo), ajustamos:
      if (finalLngDelta < lngDiff * PADDING) {
          finalLngDelta = lngDiff * PADDING;
          // Recalcula a latitude para manter a proporção da imagem
          finalLatDelta = finalLngDelta / groundAspectRatio; 
      }
      
      // Correção final do Delta de Longitude para o MapView (que usa graus, não metros)
      // O MapView precisa do Delta em GRAUS.
      // Proporção Visual = (LngDelta / LatDelta) * cosLat
      // Nós queremos que Proporção Visual == IMG_WIDTH / IMG_HEIGHT
      
      const region = {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: finalLatDelta,
        longitudeDelta: finalLatDelta * (IMG_WIDTH / IMG_HEIGHT) / cosLat, // Força a proporção exata
      };

      // 5. Snapshot
      const base64Data = await mapRef.current?.takeSnapshot({
          width: IMG_WIDTH,
          height: IMG_HEIGHT,
          region: region,
          format: 'png',
          result: 'base64',
      });
      
      // --- O RESTANTE DO HTML PERMANECE IGUAL AO SEU CÓDIGO ---
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              h1 { color: #2E7D32; text-align: center; font-size: 26px; margin-bottom: 5px; }
              .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
              
              .info-box { 
                  margin-bottom: 30px; 
                  font-size: 14px; 
                  border: 1px solid #E0E0E0; 
                  padding: 20px; 
                  border-radius: 12px; 
                  background-color: #FAFAFA; 
              }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #EEE; padding-bottom: 8px; }
              .info-row:last-child { border-bottom: 0; }
              .label { font-weight: bold; color: #666; }
              .value { color: #000; font-weight: bold; }

              .map-container { 
                border: 4px solid #2E7D32; 
                border-radius: 16px;
                padding: 0;
                overflow: hidden;
                width: 100%;
                background-color: #f0f0f0;
                display: flex;
                justify-content: center;
              }
              
              img { 
                width: 100%; 
                height: auto; 
                display: block;
              }

              .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #EEE; padding-top: 15px; }
            </style>
          </head>
          <body>
            <h1>Relatório de Mapeamento</h1>
            <p class="subtitle">AgroTech</p>
            
            <div class="info-box">
              <div class="info-row"><span class="label">Projeto:</span> <span class="value">${landName || 'Sem nome'}</span></div>
              <div class="info-row"><span class="label">Área Total:</span> <span class="value">${area > 10000 ? (area / 10000).toFixed(2) + ' hectares' : area.toFixed(2) + ' m²'}</span></div>
              <div class="info-row"><span class="label">Data:</span> <span class="value">${new Date().toLocaleDateString('pt-BR')}</span></div>
              ${metrosLineares ? `<div class="info-row"><span class="label">Plantio Estimado:</span> <span class="value">${resultadoPlantas} mudas (${metrosLineares}m)</span></div>` : ''}
            </div>

            <div class="map-container">
              <img src="data:image/png;base64,${base64Data}" />
            </div>

            <div class="footer">
              Coordenadas de Referência: ${coordinates[0].latitude.toFixed(6)}, ${coordinates[0].longitude.toFixed(6)}
              <br/>Gerado via AgroTech Mobile
            </div>
          </body>
        </html>
      `;

      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(pdfUri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
      console.error(error);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSave = async () => {
    if (!landName.trim()) { Alert.alert("Erro", "Nome inválido"); return; }
    const newLand: SavedLand = { 
      id: initialLand?.id || Date.now().toString(), 
      name: landName, 
      coordinates, 
      area, 
      date: new Date().toLocaleDateString('pt-BR') 
    };
    await saveLand(newLand);
    setSaveModalVisible(false);
    setLandName('');
    router.replace('/list');
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
      <StatusBar style="light" />
      <View style={[styles.mapHeader, { top: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

      {/* The rest of the JSX remains largely the same, just the props are removed */}
      {/* ... ViewShot, MapView, InfoPanel, Modals ... */}
            <ViewShot ref={viewShotRef} style={{ flex: 1 }} options={{ result: "data-uri" }}>
        <MapView 
            provider="google"
            ref={mapRef} 
            style={StyleSheet.absoluteFillObject} 
            mapType="satellite" 
            initialRegion={initialRegion} 
            showsUserLocation={true}
        >
          {coordinates && coordinates.length > 0 && (
              <Polygon coordinates={coordinates} strokeColor="#F00" fillColor="rgba(255,0,0,0.3)" strokeWidth={2} />
          )}

          {coordinates?.map((coord, index) => (
            <Marker 
                key={index} 
                coordinate={coord} 
                draggable 
                onDragEnd={(e) => handleDragEnd(index, e.nativeEvent.coordinate)} 
                anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerContainer}>
                <View style={styles.markerPoint} />
              </View>
            </Marker>
          ))}
        </MapView>
      </ViewShot>

      <View style={styles.crosshairContainer} pointerEvents="none">
        <View style={styles.crosshairVertical} />
        <View style={styles.crosshairHorizontal} />
      </View>

      <View style={[styles.infoPanel, { paddingBottom: 20 + insets.bottom }]}>
        
        <TouchableOpacity style={styles.fabWalk} onPress={addPointAtUserLocation}>
            <MaterialCommunityIcons name="map-marker-plus" size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.fabFixed} onPress={addPointAtCenter}>
            <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
        </TouchableOpacity>

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
// Styles remain the same
const styles = StyleSheet.create({
  mapHeader: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  backButton: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  mapTitle: { marginLeft: 15, fontSize: 18, fontWeight: 'bold', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  markerPoint: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#FFF', 
    borderColor: '#F44336', 
    borderWidth: 2,
    // Sombra suave para destacar no satélite
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  crosshairContainer: { 
    position: 'absolute', 
    top: '50%', 
    left: '50%', 
    width: 100, 
    height: 100, 
    marginTop: -50, 
    marginLeft: -50, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 1,
  },
  crosshairVertical: {
    width: 2,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 1,
    elevation: 5,
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 1,
    elevation: 5,
  },
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

  fabWalk: {
    position: 'absolute',
    top: -27.5,
    right: 90, // 20 + 55 + 15 de espaçamento
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#0288D1', // Azul GPS
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
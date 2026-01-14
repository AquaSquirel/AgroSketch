import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

interface HomeProps {
  onNavigate: (screen: string) => void;
  savedCount: number;
}

export default function Home({ onNavigate, savedCount }: HomeProps) {
  return (
    <SafeAreaView style={styles.homeContainer}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, Agrônomo</Text>
          <Text style={styles.title}>AgroSketch Pro</Text>
        </View>
        <View style={styles.avatar}>
           <FontAwesome5 name="tractor" size={24} color="#2E7D32" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.menuGrid}>
        <TouchableOpacity style={styles.cardLarge} onPress={() => onNavigate('MAP')}>
          <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="map-marker-plus" size={32} color="#2E7D32" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Novo Mapeamento</Text>
            <Text style={styles.cardDesc}>Desenhar área via satélite</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" style={{marginLeft: 'auto'}}/>
        </TouchableOpacity>

        <View style={styles.row}>
            <TouchableOpacity style={styles.cardSmall} onPress={() => onNavigate('SAVED_LIST')}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialCommunityIcons name="folder-open" size={28} color="#EF6C00" />
                </View>
                <Text style={styles.cardTitleSmall}>Meus Projetos</Text>
                <Text style={styles.cardDescSmall}>{savedCount} salvos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardSmall} onPress={() => onNavigate('CALCULATOR_ONLY')}>
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                    <MaterialCommunityIcons name="calculator" size={28} color="#1565C0" />
                </View>
                <Text style={styles.cardTitleSmall}>Calculadora</Text>
                <Text style={styles.cardDescSmall}>Sem mapa</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cardLarge} onPress={() => Alert.alert("Em breve", "Funcionalidade de cotação vindo aí!")}>
          <View style={[styles.iconCircle, { backgroundColor: '#FCE4EC' }]}>
            <MaterialCommunityIcons name="currency-usd" size={32} color="#C2185B" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Cotação de Insumos</Text>
            <Text style={styles.cardDesc}>Calcular custos estimados</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  homeContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 25, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 16, color: '#666' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32' },
  avatar: { width: 50, height: 50, backgroundColor: '#E8F5E9', borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  menuGrid: { padding: 20 },
  cardLarge: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  cardSmall: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, flex: 1, elevation: 3, marginBottom: 15, minHeight: 140, justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: 15 },
  iconCircle: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10, marginRight: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardDesc: { fontSize: 14, color: '#888', marginTop: 2 },
  cardTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 5 },
  cardDescSmall: { fontSize: 12, color: '#888' },
});
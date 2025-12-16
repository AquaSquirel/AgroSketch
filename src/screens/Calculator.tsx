import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, TouchableWithoutFeedback, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <--- O SEGREDO
import { Ionicons } from '@expo/vector-icons';

interface CalculatorProps {
  onBack: () => void;
}

export default function Calculator({ onBack }: CalculatorProps) {
  const insets = useSafeAreaInsets(); // Pega a altura da câmera/notch
  
  const [hectares, setHectares] = useState('');
  const [linha, setLinha] = useState('');
  const [planta, setPlanta] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);
  const [metrosLineares, setMetrosLineares] = useState<number | null>(null);

  const handleCalculate = () => {
    Keyboard.dismiss();
    const ha = parseFloat(hectares.replace(',', '.'));
    const l = parseFloat(linha.replace(',', '.'));
    const p = parseFloat(planta.replace(',', '.'));

    if (!ha || !l || !p) {
      Alert.alert("Ops", "Preencha todos os campos corretamente.");
      return;
    }

    // 1 Hectare = 10.000 m²
    const areaM2 = ha * 10000;
    
    // Cálculo de mudas: Área / (Linha em metros * Planta em metros)
    const lMetros = l / 100;
    const pMetros = p / 100;
    
    const qtdMudas = Math.floor(areaM2 / (lMetros * pMetros));
    const qtdMetrosLineares = Math.floor(areaM2 / lMetros);

    setResultado(qtdMudas);
    setMetrosLineares(qtdMetrosLineares);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {/* 1. View normal (sem SafeAreaView) preenchendo a tela */}
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        
        {/* 2. Header com paddingTop dinâmico (insets.top) */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity onPress={onBack}>
                <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Calculadora Rápida</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Área em Hectares:</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Ex: 1.5" 
                keyboardType="numeric"
                value={hectares}
                onChangeText={setHectares}
            />

            <Text style={styles.label}>Espaçamento (cm):</Text>
            <View style={styles.row}>
                <TextInput 
                    style={[styles.input, { flex: 1, marginRight: 10 }]} 
                    placeholder="Linha (cm)" 
                    keyboardType="numeric"
                    value={linha}
                    onChangeText={setLinha}
                />
                <TextInput 
                    style={[styles.input, { flex: 1 }]} 
                    placeholder="Planta (cm)" 
                    keyboardType="numeric"
                    value={planta}
                    onChangeText={setPlanta}
                />
            </View>

            <TouchableOpacity style={styles.btnCalculate} onPress={handleCalculate}>
                <Text style={styles.btnTxt}>CALCULAR</Text>
            </TouchableOpacity>

            {/* Resultado */}
            {resultado !== null && (
                <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>Estimativa de Plantio</Text>
                    <View style={styles.divider} />
                    
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Total de Mudas:</Text>
                        <Text style={styles.resultValue}>{resultado.toLocaleString('pt-BR')}</Text>
                    </View>
                    
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Metros Lineares:</Text>
                        <Text style={styles.resultValue}>{metrosLineares?.toLocaleString('pt-BR')} m</Text>
                    </View>
                </View>
            )}
        </ScrollView>

      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15, 
    backgroundColor: '#FFF', 
    // Sombra suave
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3.84, 
    elevation: 5,
    zIndex: 10
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 10 },
  input: { 
    backgroundColor: '#FFF', 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 12, 
    padding: 15, 
    fontSize: 18, 
    color: '#333' 
  },
  row: { flexDirection: 'row', marginBottom: 20 },
  btnCalculate: { 
    backgroundColor: '#00C853', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 10,
    elevation: 3 
  },
  btnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  resultCard: { 
    backgroundColor: '#E8F5E9', 
    marginTop: 30, 
    padding: 20, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#C8E6C9' 
  },
  resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', textAlign: 'center', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#A5D6A7', marginBottom: 15 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel: { fontSize: 16, color: '#388E3C' },
  resultValue: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20' },
});
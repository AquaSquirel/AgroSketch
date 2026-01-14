export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface LandPhoto {
  uri: string;
  date: string; // ISO String da data que foi adicionada
}

export interface LandLog {
  id: string;
  date: string; // ISO String
  title: string;
  coverPhoto?: string;
  note: string;
  photos: (LandPhoto | string)[]; // Suporta o formato novo e o antigo (string) para não quebrar
}

export interface ExperimentData {
  rowLength: string;
  rowSpacing: string;
  alleyWidth: string;
  species: Species[];
  rotation: number;
  blocks: ExperimentBlock[];
}

export interface SavedLand {
  id: string;
  name: string;
  coordinates: Coordinate[];
  area: number;
  date: string;
  logs?: LandLog[];
  experimentDraft?: ExperimentData;
}

// --- TIPOS PARA O EXPERIMENTO ---
export interface Species {
  id: string;
  name: string;
  color: string;
}

export interface PlantingRow {
  coordinates: Coordinate[];
  color: string;
  speciesName: string;
}

export interface ExperimentBlock {
  id: number;
  coordinates: Coordinate[];
  rotation: number;
  rows: Species[];
  internalLines: PlantingRow[];
  isWarning: boolean;
}

// --- CONSTANTES ---

// Essa era a constante que estava faltando e causando o erro!
export const PRESETS_CULTURAS = [
  { id: '1', nome: 'Soja', linha: '45', planta: '10' },
  { id: '2', nome: 'Milho', linha: '80', planta: '20' },
  { id: '3', nome: 'Trigo', linha: '17', planta: '5' },
  { id: '4', nome: 'Feijão', linha: '50', planta: '10' },
  { id: '5', nome: 'Algodão', linha: '90', planta: '10' },
  { id: '6', nome: 'Café', linha: '300', planta: '80' },
];

export const SPECIES_COLORS = [
  '#FF5722', // Laranja
  '#2196F3', // Azul
  '#4CAF50', // Verde
  '#FFC107', // Amarelo
  '#9C27B0', // Roxo
  '#795548', // Marrom
];
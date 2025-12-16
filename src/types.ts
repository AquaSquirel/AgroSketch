export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface SavedLand {
  id: string;
  name: string;
  coordinates: Coordinate[];
  area: number;
  date: string;
}

export const PRESETS_CULTURAS = [
  { id: '1', nome: 'Soja', linha: '45', planta: '10' },
  { id: '2', nome: 'Milho Safra', linha: '80', planta: '20' },
  { id: '3', nome: 'Milho Safrinha', linha: '50', planta: '20' },
  { id: '4', nome: 'Eucalipto', linha: '300', planta: '200' },
  { id: '5', nome: 'Café', linha: '350', planta: '70' },
];
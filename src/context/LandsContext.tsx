
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedLand, LandLog } from '../types';

// Interface para o tipo de dados do contexto
interface LandsContextType {
  savedLands: SavedLand[];
  selectedLand: SavedLand | null;
  loading: boolean;
  saveLand: (newLand: SavedLand) => Promise<void>;
  deleteLand: (id: string) => Promise<void>;
  getLandById: (id: string) => SavedLand | undefined;
  selectLand: (land: SavedLand | null) => void;
  addLog: (landId: string, log: LandLog) => Promise<void>;
  updateLog: (landId: string, updatedLog: LandLog) => Promise<void>;
  deleteLog: (landId: string, logId: string) => Promise<void>;
  saveExperimentDraft: (landId: string, data: any) => Promise<void>;
}

// Cria o Contexto com um valor padrão undefined
const LandsContext = createContext<LandsContextType | undefined>(undefined);

// Hook customizado para usar o contexto
export const useLands = () => {
  const context = useContext(LandsContext);
  if (!context) {
    throw new Error('useLands must be used within a LandsProvider');
  }
  return context;
};

// Props para o Provider
interface LandsProviderProps {
  children: ReactNode;
}

// Componente Provider
export const LandsProvider = ({ children }: LandsProviderProps) => {
  const [loading, setLoading] = useState(true);
  const [savedLands, setSavedLands] = useState<SavedLand[]>([]);
  const [selectedLand, setSelectedLand] = useState<SavedLand | null>(null);

  useEffect(() => {
    const loadSavedLandsFromStorage = async () => {
      setLoading(true);
      try {
        const jsonValue = await AsyncStorage.getItem('@my_lands');
        if (jsonValue != null) {
          setSavedLands(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.log("Erro ao carregar terras do storage", e);
      } finally {
        setLoading(false);
      }
    };
    loadSavedLandsFromStorage();
  }, []);

  const saveLand = async (newLand: SavedLand) => {
    let updatedList;
    const exists = savedLands.find(l => l.id === newLand.id);

    if (exists) {
      updatedList = savedLands.map(l => (l.id === newLand.id ? newLand : l));
    } else {
      updatedList = [...savedLands, newLand];
    }

    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
  };

  const deleteLand = async (id: string) => {
    const updatedList = savedLands.filter(l => l.id !== id);
    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
  };

  const getLandById = (id: string) => {
    return savedLands.find(l => l.id === id);
  };

  const addLog = async (landId: string, log: LandLog) => {
    const updatedList = savedLands.map(l => {
      if (l.id === landId) {
        const currentLogs = l.logs || [];
        return { ...l, logs: [log, ...currentLogs] };
      }
      return l;
    });

    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
  };

  const updateLog = async (landId: string, updatedLog: LandLog) => {
    const updatedList = savedLands.map(l => {
      if (l.id === landId) {
        const currentLogs = l.logs || [];
        const newLogs = currentLogs.map(log => log.id === updatedLog.id ? updatedLog : log);
        return { ...l, logs: newLogs };
      }
      return l;
    });

    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
  };

  const deleteLog = async (landId: string, logId: string) => {
    const updatedList = savedLands.map(l => {
        if (l.id === landId) {
            const currentLogs = l.logs || [];
            const newLogs = currentLogs.filter(log => log.id !== logId);
            return { ...l, logs: newLogs };
        }
        return l;
    });

    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
  };

  const saveExperimentDraft = async (landId: string, data: any) => {
    const updatedList = savedLands.map(l => {
        if (l.id === landId) {
            return { ...l, experimentDraft: data };
        }
        return l;
    });
    setSavedLands(updatedList);
    await AsyncStorage.setItem('@my_lands', JSON.stringify(updatedList));
  };
  
  const value = {
    savedLands,
    selectedLand,
    loading,
    saveLand,
    deleteLand,
    getLandById,
    selectLand: setSelectedLand,
    addLog,
    updateLog,
    deleteLog,
    saveExperimentDraft,
  };

  return <LandsContext.Provider value={value}>{children}</LandsContext.Provider>;
};

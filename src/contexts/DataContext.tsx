import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Controller, Game, Station, Session, DeviceType } from '../types';
import { getDatabase, waitForInit } from '../database';

interface StationStats {
  totalRevenue: number;
  totalSessions: number;
  totalDuration: number;
}

interface Table<T> {
  data: Record<number, T>;
  loading: boolean;
  error: string | null;
}

interface DataContextType {
  tables: {
    users: Table<User>;
    products: Table<Product>;
    controllers: Table<Controller>;
    games: Table<Game>;
    stations: Table<Station & { currentSession?: Session; lastSession?: Session }>;
  };
  stationStats: StationStats;
  refreshData: () => Promise<void>;
  updateStationSession: (stationId: number, session: Session | undefined) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [tables, setTables] = useState<DataContextType['tables']>({
    users: { data: {}, loading: true, error: null },
    products: { data: {}, loading: true, error: null },
    controllers: { data: {}, loading: true, error: null },
    games: { data: {}, loading: true, error: null },
    stations: { data: {}, loading: true, error: null }
  });

  const [stationStats, setStationStats] = useState<StationStats>({
    totalRevenue: 0,
    totalSessions: 0,
    totalDuration: 0
  });

  const calculateSessionCost = (session: Session): number => {
    const start_time = new Date(session.start_time).getTime();
    const end_time = new Date(session.end_time || new Date()).getTime();
    const durationMinutes = (end_time - start_time) / (1000 * 60);
    return durationMinutes * session.final_price;
  };

  const updateStationStats = (session: Session) => {
    const duration = session.end_time
      ? (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000 / 60
      : 0;

    const totalAmount = calculateSessionCost(session);

    setStationStats(prev => ({
      totalRevenue: prev.totalRevenue + totalAmount,
      totalSessions: prev.totalSessions + 1,
      totalDuration: prev.totalDuration + duration
    }));
  };

  const updateStationSession = (stationId: number, session: Session | undefined) => {
    setStations(current => current.map(station => {
      if (station.id === stationId) {
        // If ending a session, store it as lastSession and update stats
        if (station.currentSession && !session) {
          const endedSession = {
            ...station.currentSession,
            endTime: new Date().toISOString(),
            totalAmount: calculateSessionCost(station.currentSession)
          };
          updateStationStats(endedSession);
          return {
            ...station,
            status: 'available',
            currentSession: undefined,
            lastSession: endedSession
          };
        }
        // Starting new session, clear lastSession
        return {
          ...station,
          status: session ? 'occupied' : 'available',
          currentSession: session,
          lastSession: undefined
        };
      }
      return station;
    }));
  };

  const loadData = async () => {
    await waitForInit();
    const db = await getDatabase();

    const loadTable = async <T extends { id: number }>(
      tableName: keyof DataContextType['tables'],
      query: string
    ) => {
      try {
        const result = await db.exec(query);
        const items = result[0]?.values.map((row: any[]) => {
          const item = Object.fromEntries(
            result[0].columns.map((col, index) => [col, row[index]])
          ) as T;
          
          // Special handling for stations
          if (tableName === 'stations') {
            return {
              ...item,
              currentSession: undefined,
              lastSession: undefined
            } as T;
          }
          
          return item;
        }) || [];

        setTables(prev => ({
          ...prev,
          [tableName]: {
            data: Object.fromEntries(items.map(item => [item.id, item])),
            loading: false,
            error: null
          }
        }));
      } catch (error) {
        setTables(prev => ({
          ...prev,
          [tableName]: {
            ...prev[tableName],
            loading: false,
            error: `Failed to load ${tableName}`
          }
        }));
      }
    };

    await Promise.all([
      loadTable<User>('users', 'SELECT * FROM users'),
      loadTable<Product>('products', 'SELECT * FROM products'),      
      loadTable<Controller>('controllers', 'SELECT * FROM controllers'),
      loadTable<Game>('games', 'SELECT * FROM games'),
      loadTable<Station>('stations', 'SELECT * FROM stations')
    ]);

    // After all tables loaded, check if any have errors
    const hasErrors = Object.values(tables).some(table => table.error);
    if (hasErrors) {
      console.error('Some tables failed to load');
    }
  };

  const refreshData = async () => {
    // Set all tables to loading state
    setTables(prev => ({
      users: { ...prev.users, loading: true },
      products: { ...prev.products, loading: true },
     
      controllers: { ...prev.controllers, loading: true },
      games: { ...prev.games, loading: true },
      stations: { ...prev.stations, loading: true }
    }));
    
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ 
      tables,
      stationStats,
      refreshData,
      updateStationSession
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

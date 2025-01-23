import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Device, Controller, Game, Station, Session } from '../types';
import db from '../database';

interface StationStats {
  totalRevenue: number;
  totalSessions: number;
  totalDuration: number;
}

interface DataContextType {
  users: User[];
  products: Product[];
  devices: Device[];
  controllers: Controller[];
  games: Game[];
  stations: (Station & { currentSession?: Session; lastSession?: Session })[];
  stationStats: StationStats;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateStationSession: (stationId: number, session: Session | undefined) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [stations, setStations] = useState<(Station & { currentSession?: Session; lastSession?: Session })[]>([
    { id: 1, name: 'PS5-01', status: 'available', type: 'PS5', location: 'Station 1', pricePerMinute: 0.3 },
    { id: 2, name: 'PS5-02', status: 'available', type: 'PS5', location: 'Station 2', pricePerMinute: 0.3 },
    { id: 3, name: 'PS5-03', status: 'maintenance', type: 'PS5', location: 'Station 3', pricePerMinute: 0.3 },
    { id: 4, name: 'PS4-01', status: 'available', type: 'PS4', location: 'Station 4', pricePerMinute: 0.2 },
    { id: 5, name: 'Xbox-01', status: 'available', type: 'Xbox Series X', location: 'Station 5', pricePerMinute: 0.3 },
    { id: 6, name: 'Switch-01', status: 'available', type: 'Nintendo Switch', location: 'Station 6', pricePerMinute: 0.2 }
  ]);
  const [stationStats, setStationStats] = useState<StationStats>({
    totalRevenue: 0,
    totalSessions: 0,
    totalDuration: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateSessionCost = (session: Session): number => {
    const startTime = new Date(session.startTime).getTime();
    const endTime = new Date(session.endTime || new Date()).getTime();
    const durationMinutes = (endTime - startTime) / (1000 * 60);
    return durationMinutes * session.pricePerMinute;
  };

  const updateStationStats = (session: Session) => {
    const duration = session.endTime 
      ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 / 60 
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
    try {
      await db.waitForInit();

      const [
        usersData,
        productsData,
        devicesData,
        controllersData,
        gamesData
      ] = await Promise.all([
        db.query<User>(`
          SELECT id, name, phone, role, membership_type as membershipType, 
          credit, last_active as lastActive FROM users
        `),
        db.query<Product>('SELECT * FROM products'),
        db.query<Device>(`
          SELECT id, name, type, status, location, 
          price_per_minute as pricePerMinute FROM devices
        `),
        db.query<Controller>(`
          SELECT id, name, type, status, price_per_minute as pricePerMinute, 
          color FROM controllers
        `),
        db.query<Game>(`
          SELECT id, name, price_per_minute as pricePerMinute, image, 
          device_types as deviceTypes, is_multiplayer as isMultiplayer 
          FROM games
        `)
      ]);

      setUsers(usersData);
      setProducts(productsData);
      setDevices(devicesData);
      setControllers(controllersData);
      setGames(gamesData.map(game => ({
        ...game,
        deviceTypes: JSON.parse(game.deviceTypes as string),
        isMultiplayer: Boolean(game.isMultiplayer)
      })));

      setError(null);
    } catch (error) {
      setError('Failed to load data');
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DataContext.Provider value={{ 
      users, products, devices, controllers, games,
      stations, stationStats, isLoading, error, 
      refreshData, updateStationSession
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
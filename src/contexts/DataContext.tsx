import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Device, Controller, Game, Station, Session } from '../types';
import { getDatabase, waitForInit } from '../database';

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
    { id: 1, name: 'PS5-01', status: 'available', type: 'PS5', location: 'Station 1', price_per_minute: 0.3 },
    { id: 2, name: 'PS5-02', status: 'available', type: 'PS5', location: 'Station 2', price_per_minute: 0.3 },
    { id: 3, name: 'PS5-03', status: 'maintenance', type: 'PS5', location: 'Station 3', price_per_minute: 0.3 },
    { id: 4, name: 'PS4-01', status: 'available', type: 'PS4', location: 'Station 4', price_per_minute: 0.2 },
    { id: 5, name: 'Xbox-01', status: 'available', type: 'Xbox Series X', location: 'Station 5', price_per_minute: 0.3 },
    { id: 6, name: 'Switch-01', status: 'available', type: 'Nintendo Switch', location: 'Station 6', price_per_minute: 0.2 }
  ]);
  const [stationStats, setStationStats] = useState<StationStats>({
    totalRevenue: 0,
    totalSessions: 0,
    totalDuration: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateSessionCost = (session: Session): number => {
    const start_time = new Date(session.start_time).getTime();
    const end_time = new Date(session.end_time || new Date()).getTime();
    const durationMinutes = (end_time - start_time) / (1000 * 60);
    return durationMinutes * session.price_per_minute;
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
    try {
      await waitForInit();
      const db = await getDatabase();

     
      
      const [
        usersResult,
        productsResult,
        devicesResult,
        controllersResult,
        gamesResult
      ] = await Promise.all([
        db.exec(`SELECT * FROM users`),
        db.exec('SELECT * FROM products'),
        db.exec('SELECT * FROM devices'),
        db.exec('SELECT * FROM controllers'),
        db.exec('SELECT * FROM games')
      ]);

      // Convert query results to typed objects
      const usersData = usersResult[0]?.values.map(row => ({
        id: row[0],
        name: row[1],
        phone: row[2],
        password_hash: row[3],
        role: row[4],
        membership_type: row[5],
        credit: row[6],
        last_active: row[7],
        created_at: row[8],
        updated_at: row[9]
      })) as User[];

      const productsData = productsResult[0]?.values.map(row => ({
        id: row[0],
        name: row[1],
        price: row[2],
        cost: row[3],
        category: row[4],
        image: row[5],
        stock: row[6],
        barcode: row[7],
        created_at: row[8],
        updated_at: row[9]
      })) as Product[];

      const devicesData = devicesResult[0]?.values.map(row => ({
        id: row[0],
        name: row[1],
        type: row[2],
        status: row[3],
        location: row[4],
        price_per_minute: row[5],
        created_at: row[6],
        updated_at: row[7]
      })) as Device[];

      const controllersData = controllersResult[0]?.values.map(row => ({
        id: row[0],
        name: row[1],
        type: row[2],
        status: row[3],
        price_per_minute: row[4],
        color: row[5],
        created_at: row[6],
        updated_at: row[7]
      })) as Controller[];

      const gamesData = gamesResult[0]?.values.map(row => ({
        id: row[0],
        name: row[1],
        price_per_minute: row[2],
        image: row[3],
        is_multiplayer: Boolean(row[4]),
        created_at: row[5],
        updated_at: row[6],
        compatible_devices: row[4] ? JSON.parse(row[4] as string) : []
      })) as Game[];

      setUsers(usersData);
      setProducts(productsData);
      setDevices(devicesData);
      setControllers(controllersData);
      setGames(gamesData);

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
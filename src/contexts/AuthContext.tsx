import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getDatabase, waitForInit } from '../database';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const loadUser = async () => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      try {
        await waitForInit();
        const db = await getDatabase();
        const userResult = await db.exec(`
          SELECT * FROM users WHERE id = ?
        `, [savedUserId]);
        
        if (userResult[0]?.values.length > 0) {
          const userData = userResult[0].values[0];
          const user = {
            id: userData[0],
            name: userData[1],
            phone: userData[2],
            role: userData[3],
            membership_type: userData[4],
            credit: userData[5],
            last_active: userData[6],
            created_at: userData[7],
            updated_at: userData[8]
          } as User;
          setUser(user);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem('userId');
      }
    }
    setIsLoading(false);
  };

  const login = async (phone: string, password: string) => {
    try {
      setError(null);
      await waitForInit();
      const database = await getDatabase();
      const userResult = await database.exec(`
        SELECT id, name, phone, role, membership_type as membershipType, 
        credit, last_active as lastActive
        FROM users WHERE phone = ? AND password_hash = ?
      `, [phone, password]);

      if (!user) {
        throw new Error('Invalid phone number or password');
      }

      const db = await getDatabase();
      await db.exec(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      setUser(user);
      localStorage.setItem('userId', user.id.toString());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userId');
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
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
            role: userData[4],
            membership_type: userData[5],
            credit: userData[6],
            last_active: userData[7],
            created_at: userData[8],
            updated_at: userData[9]
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
        SELECT id, name, phone, role, password_hash, membership_type, credit, last_active
        FROM users WHERE phone = ? AND password_hash = ?
      `, [phone, password]);
      
      if (!userResult[0]?.values?.length) {
        throw new Error('Invalid phone number or password');
      }

      const userData = userResult[0].values[0];
      const foundUser = {
        id: userData[0],
        name: userData[1],
        phone: userData[2],
        role: userData[3],
        password_hash: userData[4],
        membership_type: userData[5],
        credit: userData[6],
        last_active: userData[7]
      } as User;

      const db = await getDatabase();
      await db.exec(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
        [foundUser.id]
      );

      setUser(foundUser);
      localStorage.setItem('userId', foundUser.id.toString());
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
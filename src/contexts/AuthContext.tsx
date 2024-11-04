import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = user?.role === 'admin';

  // Simulated user data - in production, this would come from your backend
  const users: User[] = [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      membershipType: 'premium',
      lastActive: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff',
      membershipType: 'standard',
      lastActive: new Date().toISOString(),
    }
  ];

  const login = async (email: string, password: string) => {
    // Simulate API call
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    // In production, verify password hash here
    if (password !== '123456') {
      throw new Error('Invalid credentials');
    }
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
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
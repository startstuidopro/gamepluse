export interface Product {
  id: number;
  name: string;
  price: number;
  category: 'drinks' | 'snacks' | 'sweets';
  image: string;
}

export type UserRole = 'admin' | 'accountant' | 'staff';

export interface User {
  id: number;
  name: string;
  email: string;
  membershipType: 'standard' | 'premium';
  role: UserRole;
  avatar?: string;
  lastActive?: string;
}

export interface Session {
  id: number;
  stationId: number;
  userId: string;
  startTime: string;
  endTime?: string;
  game?: string;
  pricePerMinute: number;
  totalAmount?: number;
}

export interface Station {
  id: number;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
  currentSession?: Session;
}
import React from 'react';
import { Gamepad2, ShoppingCart, Users, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  activeTab: 'stations' | 'shop' | 'users';
  onTabChange: (tab: 'stations' | 'shop' | 'users') => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-800 border-b border-slate-700 py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-purple-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            PlayStation Lounge
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <button 
              onClick={() => onTabChange('stations')}
              className={`flex items-center gap-2 transition ${
                activeTab === 'stations' ? 'text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Gamepad2 className="h-5 w-5" />
              Stations
            </button>
            <button 
              onClick={() => onTabChange('shop')}
              className={`flex items-center gap-2 transition ${
                activeTab === 'shop' ? 'text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              Shop
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => onTabChange('users')}
                className={`flex items-center gap-2 transition ${
                  activeTab === 'users' ? 'text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="h-5 w-5" />
                Users
              </button>
            )}
          </nav>
          <div className="flex items-center gap-4 pl-6 border-l border-slate-700">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white transition"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
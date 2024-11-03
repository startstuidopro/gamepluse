import React from 'react';
import { Gamepad2, ShoppingCart, Users } from 'lucide-react';

interface HeaderProps {
  activeTab: 'stations' | 'shop' | 'users';
  onTabChange: (tab: 'stations' | 'shop' | 'users') => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-slate-800 border-b border-slate-700 py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-purple-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            PlayStation Lounge
          </h1>
        </div>
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
          <button 
            onClick={() => onTabChange('users')}
            className={`flex items-center gap-2 transition ${
              activeTab === 'users' ? 'text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="h-5 w-5" />
            Users
          </button>
        </nav>
      </div>
    </header>
  );
}
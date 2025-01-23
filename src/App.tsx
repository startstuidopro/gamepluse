import React from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Header from './components/Header';
import Stats from './components/Stats';
import StationGrid from './components/StationGrid';
import Shop from './components/shop/Shop';
import UserManagement from './components/users/UserManagement';
import DeviceManager from './components/admin/DeviceManager';
import GameManager from './components/admin/GameManager';
import ControllerManager from './components/admin/ControllerManager';
import DiscountManager from './components/admin/DiscountManager';
import { useData } from './contexts/DataContext';

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const { stationStats, isLoading: dataLoading } = useData();
  const [activeTab, setActiveTab] = React.useState<'stations' | 'shop' | 'users' | 'devices' | 'games' | 'controllers' | 'discounts'>('stations');

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-4 py-8">
        <Stats 
          totalRevenue={stationStats.totalRevenue} 
          averageSessionTime={stationStats.totalSessions > 0 
            ? stationStats.totalDuration / stationStats.totalSessions 
            : 0
          } 
        />
        {activeTab === 'stations' && <StationGrid />}
        {activeTab === 'shop' && <Shop />}
        {activeTab === 'users' && user.role === 'admin' && <UserManagement />}
        {activeTab === 'devices' && user.role === 'admin' && <DeviceManager />}
        {activeTab === 'games' && user.role === 'admin' && <GameManager />}
        {activeTab === 'controllers' && user.role === 'admin' && <ControllerManager />}
        {activeTab === 'discounts' && user.role === 'admin' && <DiscountManager />}
        {(activeTab === 'users' || activeTab === 'devices' || activeTab === 'games' || 
          activeTab === 'controllers' || activeTab === 'discounts') && 
          user.role !== 'admin' && (
          <div className="text-center py-12">
            <p className="text-slate-400">You don't have permission to access this page.</p>
          </div>
        )}
      </main>
    </div>
  );
}
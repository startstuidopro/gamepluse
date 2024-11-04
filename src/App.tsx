import React from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Header from './components/Header';
import Stats from './components/Stats';
import StationGrid from './components/StationGrid';
import Shop from './components/shop/Shop';
import UserManagement from './components/users/UserManagement';

export default function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'stations' | 'shop' | 'users'>('stations');

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-4 py-8">
        <Stats />
        {activeTab === 'stations' && <StationGrid />}
        {activeTab === 'shop' && <Shop />}
        {activeTab === 'users' && user.role === 'admin' && <UserManagement />}
        {activeTab === 'users' && user.role !== 'admin' && (
          <div className="text-center py-12">
            <p className="text-slate-400">You don't have permission to access this page.</p>
          </div>
        )}
      </main>
    </div>
  );
}
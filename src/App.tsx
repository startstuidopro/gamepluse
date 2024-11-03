import React, { useState } from 'react';
import Header from './components/Header';
import Stats from './components/Stats';
import StationGrid from './components/StationGrid';
import Shop from './components/shop/Shop';
import UserManagement from './components/users/UserManagement';

function App() {
  const [activeTab, setActiveTab] = useState<'stations' | 'shop' | 'users'>('stations');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-4 py-8">
        <Stats />
        {activeTab === 'stations' && <StationGrid />}
        {activeTab === 'shop' && <Shop />}
        {activeTab === 'users' && <UserManagement />}
      </main>
    </div>
  );
}

export default App;
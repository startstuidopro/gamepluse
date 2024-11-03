import React, { useState } from 'react';
import { PlaySquare, Timer, DollarSign } from 'lucide-react';
import { Station, Session } from '../types';
import SessionControl from './SessionControl';

export default function StationGrid() {
  const [stations, setStations] = useState<Station[]>([
    { id: 1, name: 'PS5-01', status: 'occupied', currentSession: { id: 1, stationId: 1, userId: 'Alex M.', startTime: new Date(Date.now() - 5400000).toISOString(), game: 'God of War Ragnarök', pricePerMinute: 0.5 } },
    { id: 2, name: 'PS5-02', status: 'available' },
    { id: 3, name: 'PS5-03', status: 'occupied', currentSession: { id: 2, stationId: 3, userId: 'Sarah K.', startTime: new Date(Date.now() - 2700000).toISOString(), game: 'Spider-Man 2', pricePerMinute: 0.5 } },
    { id: 4, name: 'PS5-04', status: 'maintenance' },
    { id: 5, name: 'PS5-05', status: 'occupied', currentSession: { id: 3, stationId: 5, userId: 'John D.', startTime: new Date(Date.now() - 8100000).toISOString(), game: 'FC 24', pricePerMinute: 0.5 } },
    { id: 6, name: 'PS5-06', status: 'available' },
    { id: 7, name: 'PS5-07', status: 'occupied', currentSession: { id: 4, stationId: 7, userId: 'Mike R.', startTime: new Date(Date.now() - 1800000).toISOString(), game: 'Mortal Kombat 1', pricePerMinute: 0.5 } },
    { id: 8, name: 'PS5-08', status: 'available' },
    { id: 9, name: 'PS5-09', status: 'occupied', currentSession: { id: 5, stationId: 9, userId: 'Emma S.', startTime: new Date(Date.now() - 4500000).toISOString(), game: 'Final Fantasy XVI', pricePerMinute: 0.5 } },
    { id: 10, name: 'PS5-10', status: 'available' },
    { id: 11, name: 'PS5-11', status: 'maintenance' },
    { id: 12, name: 'PS5-12', status: 'occupied', currentSession: { id: 6, stationId: 12, userId: 'Chris P.', startTime: new Date(Date.now() - 3300000).toISOString(), game: 'NBA 2K24', pricePerMinute: 0.5 } },
  ]);

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showSessionControl, setShowSessionControl] = useState(false);

  const getStatusColor = (status: Station['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'occupied':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'maintenance':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  const calculateTimeLeft = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000 / 60);
    return `${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, '0')}`;
  };

  const calculateCurrentAmount = (startTime: string, pricePerMinute: number) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const minutesElapsed = Math.floor((now - start) / 1000 / 60);
    return (minutesElapsed * pricePerMinute).toFixed(2);
  };

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setShowSessionControl(true);
  };

  const handleSessionUpdate = (stationId: number, session: Session | undefined) => {
    setStations(stations.map(station => {
      if (station.id === stationId) {
        return {
          ...station,
          status: session ? 'occupied' : 'available',
          currentSession: session
        };
      }
      return station;
    }));
    setShowSessionControl(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Gaming Stations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stations.map((station) => (
          <div
            key={station.id}
            className={`rounded-xl border ${
              getStatusColor(station.status)
            } p-6 backdrop-blur-sm transition-transform hover:scale-105`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{station.name}</h3>
                <span className="text-sm capitalize">{station.status}</span>
              </div>
              <PlaySquare className="h-6 w-6" />
            </div>

            {station.status === 'occupied' && station.currentSession && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    {calculateTimeLeft(station.currentSession.startTime)} elapsed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    ${calculateCurrentAmount(station.currentSession.startTime, station.currentSession.pricePerMinute)}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">User: {station.currentSession.userId}</p>
                  <p className="text-sm text-slate-400">Game: {station.currentSession.game}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => handleStationClick(station)}
              className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition
                ${
                  station.status === 'available'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : station.status === 'occupied'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }
              `}
            >
              {station.status === 'available'
                ? 'Start Session'
                : station.status === 'occupied'
                ? 'End Session'
                : 'Under Maintenance'}
            </button>
          </div>
        ))}
      </div>

      {showSessionControl && selectedStation && (
        <SessionControl
          station={selectedStation}
          onClose={() => setShowSessionControl(false)}
          onUpdateSession={handleSessionUpdate}
        />
      )}
    </div>
  );
}
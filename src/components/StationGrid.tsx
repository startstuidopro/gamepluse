import  { useState, useEffect } from 'react';
import { PlaySquare } from 'lucide-react';
import { Session, Game } from '../types';
import type { Station } from '../types';
import { gameService } from '../services/gameService';
import SessionControl from './SessionControl';
import SessionTimer from './SessionTimer';
import SessionSummary from './SessionSummary';
import { useData } from '../contexts/DataContext';

export default function StationGrid() {
  const { stations,  updateStationSession } = useData();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showSessionControl, setShowSessionControl] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [_ , setLoadingGames] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const result = await gameService.getGames();
        if (result.success && result.data) {
          setGames(Array.isArray(result.data) ? result.data.flat() : []);
        }
      } catch (error) {
        console.error('Failed to load games:', error);
      } finally {
        setLoadingGames(false);
      }
    };

    loadGames();
  }, []);

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

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setShowSessionControl(true);
  };

  const handleSessionUpdate = (stationId: number, session: Session | undefined) => {
    updateStationSession(stationId, session);
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
                <p className="text-sm text-slate-400 mt-1">{station.type}</p>
                <p className="text-sm text-slate-400">{station.location}</p>
                <p className="text-sm text-slate-400">Base Price: ${station?.price_per_minute?.toFixed(2) ?? '0.00'}/min</p>
              </div>
              <PlaySquare className="h-6 w-6" />
            </div>

            {station.status === 'occupied' && station.currentSession && (
              <div className="space-y-3 mb-4">
                <SessionTimer session={station.currentSession} />
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">User: {station.currentSession.user_id}</p>
                  <p className="text-sm text-slate-400">Game: {station.currentSession.game?.name}</p>
                  {station.currentSession.attached_controllers && station.currentSession.attached_controllers.length > 0 && (
                    <p className="text-sm text-slate-400">
                      Controllers: {station.currentSession.attached_controllers.length}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => handleStationClick(station)}
              disabled={station.status === 'maintenance'}
              className={`w-full py-2 px-4 rounded-lg font-medium transition
                ${
                  station.status === 'available'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : station.status === 'occupied'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white cursor-not-allowed'
                }
              `}
            >
              {station.status === 'available'
                ? 'Start Session'
                : station.status === 'occupied'
                ? 'End Session'
                : 'Under Maintenance'}
            </button>

            {station.lastSession && (
              <SessionSummary session={station.lastSession} />
            )}
          </div>
        ))}
      </div>

      {showSessionControl && selectedStation && (
        <SessionControl
          station={selectedStation}
          onClose={() => setShowSessionControl(false)}
          onUpdateSession={handleSessionUpdate}
          games={games.filter(game => game.compatible_devices?.includes(selectedStation.type))}
        />
      )}
    </div>
  );
}
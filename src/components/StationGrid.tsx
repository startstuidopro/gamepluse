import  { useState, useEffect, useCallback } from 'react';
import { PlaySquare } from 'lucide-react';
import { Session, Game, DeviceType } from '../types';
import type { Station } from '../types';
import { gameService } from '../services/gameService';
import SessionControl from './SessionControl';
import SessionTimer from './SessionTimer';
import SessionSummary from './SessionSummary';
import { useData } from '../contexts/DataContext';
import { SessionModel } from '../database/models/SessionModel';

export default function StationGrid() {
  const { tables,  updateStationSession, setTables } = useData();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showSessionControl, setShowSessionControl] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [_ , setLoadingGames] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const result = await gameService.getGames();
        if (result.success && result.data) {
          if (Array.isArray(result.data)) {
            const validGames = result.data.filter((g): g is Game =>
              g && typeof g === 'object' &&
              'id' in g && 'name' in g &&
              'price_per_minute' in g
            );
         
            setGames(validGames);
          } else {
            console.warn('No valid games data received');
            setGames([]);
          }
        }
      } catch (error) {
        console.error('Failed to load games:', error);
      } finally {
        setLoadingGames(false);
      }
    };

    loadGames();
  }, []);

  useEffect(() => {
    const loadActiveSessions = async () => {
        const sessionModel = await SessionModel.getInstance();       
        
        const updatedStations = { ...tables.stations.data };
        
        for (const station of Object.values(tables.stations.data)) {
            if (station.current_session_id) {
                const result = await sessionModel.getActiveSession(station.id);
                if (result.success && result.data) {
                    updatedStations[station.id] = {
                        ...station,
                        currentSession: result.data
                    };
                }
            }
        }

        // console.log("updatedStations",updatedStations);

        setTables(prev => ({
            ...prev,
            stations: {
                ...prev.stations,
                data: updatedStations
            }
        }));
    };

    if (!tables.stations.loading && Object.keys(tables.stations.data).length > 0) {
        loadActiveSessions();
    }
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

  const handleSessionUpdate = useCallback(async (stationId: number, sessionId: number | null) => {
    await updateStationSession(stationId, sessionId);
  }, [updateStationSession]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Gaming Stations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Object.values(tables.stations.data).map((station) => (
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
                  <p className="text-sm text-slate-400">
                    User: {station.currentSession.user.name} 
                    ({station.currentSession.user.membership_type})
                  </p>
                  {station.currentSession.game && (
                    <p className="text-sm text-slate-400">
                      Game: {station.currentSession.game.name}
                    </p>
                  )}
                  {station.currentSession.attached_controllers && 
                   station.currentSession.attached_controllers.length > 0 && (
                    <p className="text-sm text-slate-400">
                      Controllers: {station.currentSession.attached_controllers.length}
                    </p>
                  )}
                  <p className="text-sm text-slate-400">
                    Rate: ${station.currentSession.final_price}/min
                  </p>
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
          games={games.filter(game => {
            try {
              const devices: DeviceType[] = game.device_types || [];
              return devices.includes(selectedStation.type as DeviceType);
            } catch {
              return false;
            }
          })}
        />
      )}
    </div>
  );
}
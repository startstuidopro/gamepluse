import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Station, Session } from '../types';
import { addSessionToDatabase, updateSessionInDatabase } from '../utils/database';

interface SessionControlProps {
  station: Station;
  onClose: () => void;
  onUpdateSession: (stationId: number, session: Session | undefined) => void;
}

export default function SessionControl({ station, onClose, onUpdateSession }: SessionControlProps) {
  const [formData, setFormData] = useState({
    userId: '',
    game: '',
    pricePerMinute: 0.5,
  });

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: Session = {
      id: Date.now(),
      stationId: station.id,
      userId: formData.userId,
      startTime: new Date().toISOString(),
      game: formData.game,
      pricePerMinute: formData.pricePerMinute,
    };
    addSessionToDatabase();
    onUpdateSession(station.id, newSession);
  };

  const handleEndSession = () => {
    console.log('Ending session...');
    if (station.currentSession) {
      const endTime = new Date().toISOString();
      const startTime = new Date(station.currentSession.startTime).getTime();
      const endTimeMs = new Date(endTime).getTime();
      const minutesElapsed = Math.floor((endTimeMs - startTime) / 1000 / 60);
      const totalAmount = minutesElapsed * station.currentSession.pricePerMinute;

      const endedSession: Session = {
        ...station.currentSession,
        endTime,
        totalAmount,
      };

      const updatedData = {
        user_id: parseInt(station.currentSession.userId, 10),
        start_time: station.currentSession.startTime,
        end_time: endTime,
      };

      updateSessionInDatabase(station.currentSession.id, updatedData, (err) => {
        if (err) {
          console.error('Error updating session in database:', err);
        } else {
          console.log('Session updated in database successfully');
          console.log('Calling onUpdateSession with undefined...');
          onUpdateSession(station.id, undefined);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {station.status === 'available' ? 'Start Session' : 'End Session'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        {station.status === 'available' ? (
          <form onSubmit={handleStartSession} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-slate-400 mb-1">
                User Name
              </label>
              <input
                type="text"
                id="userId"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label htmlFor="game" className="block text-sm font-medium text-slate-400 mb-1">
                Game
              </label>
              <input
                type="text"
                id="game"
                value={formData.game}
                onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label htmlFor="pricePerMinute" className="block text-sm font-medium text-slate-400 mb-1">
                Price per Minute ($)
              </label>
              <input
                type="number"
                id="pricePerMinute"
                value={formData.pricePerMinute}
                onChange={(e) => setFormData({ ...formData, pricePerMinute: parseFloat(e.target.value) })}
                step="0.1"
                min="0.1"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
            >
              Start Session
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {station.currentSession && (
              <>
                <div className="space-y-2">
                  <p className="text-slate-400">
                    User: <span className="text-white">{station.currentSession.userId}</span>
                  </p>
                  <p className="text-slate-400">
                    Game: <span className="text-white">{station.currentSession.game}</span>
                  </p>
                  <p className="text-slate-400">
                    Started: <span className="text-white">
                      {new Date(station.currentSession.startTime).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-slate-400">
                    Current Amount: <span className="text-white">
                      ${((Date.now() - new Date(station.currentSession.startTime).getTime()) / 1000 / 60 * station.currentSession.pricePerMinute).toFixed(2)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={handleEndSession}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition"
                >
                  End Session
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

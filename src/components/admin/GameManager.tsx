import React, { useState, useEffect } from 'react';
import { Game, DeviceType } from '../../types';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { gameService } from '../../services/gameService';

export default function GameManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<Game>({
    id: 0,
    name: '',
    price_per_minute: 0.5,
    image: '',
    compatible_devices: [],
    is_multiplayer: false
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    const result = await gameService.getGames();
    if (result.success && result.data) {
      const games = Array.isArray(result.data) ? result.data : [result.data];
      setGames(games as Game[]);
    } else {
      setError(result.error || 'Failed to load games');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate price_per_minute
    if (isNaN(formData.price_per_minute) || formData.price_per_minute < 0) {
      setError('Price per minute must be a valid positive number');
      return;
    }

    const gameData = {
      name: formData.name,
      price_per_minute: Number(formData.price_per_minute.toFixed(2)), // Ensure 2 decimal places
      image: formData.image,
      is_multiplayer: formData.is_multiplayer,
      compatible_devices: formData.compatible_devices
    };
console.log(gameData);
    if (editingGame) {
      const result = await gameService.updateGame(editingGame.id, gameData);
      if (result.success) {
        await loadGames();
        setEditingGame(null);
      } else {
        setError(result.error || 'Failed to update game');
        return;
      }
    } else {
      const result = await gameService.createGame(gameData, formData.compatible_devices || []);
      if (result.success) {
        await loadGames();
      } else {
        setError(result.error || 'Failed to create game');
        return;
      }
    }

    setShowForm(false);
    setFormData({
      id: 0,
      name: '',
      price_per_minute: 0.5,
      image: '',
      compatible_devices: [],
      is_multiplayer: false
    });
  };

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      id: game.id,
      name: game.name,
      price_per_minute: game.price_per_minute,
      image: game.image,
      compatible_devices: game.compatible_devices,
      is_multiplayer: game.is_multiplayer
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      setError(null);
      const result = await gameService.deleteGame(id);
      if (result.success) {
        await loadGames();
      } else {
        setError(result.error || 'Failed to delete game');
      }
    }
  };

  const handleDeviceTypeToggle = (type: DeviceType) => {
    setFormData(prev => ({
      ...prev,
      compatible_devices: prev.compatible_devices?.includes(type)
        ? prev.compatible_devices.filter(t => t !== type)
        : [...(prev.compatible_devices || []), type]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Game Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingGame(null);
            setFormData({
              id: 0,
              name: '',
              price_per_minute: 0.5,
              image: '',
              compatible_devices: [],
              is_multiplayer: false
            });
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
        >
          <Plus className="h-5 w-5" />
          Add Game
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">
            {editingGame ? 'Edit Game' : 'Add New Game'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Price per Minute ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_per_minute}
                  onChange={e => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      setFormData({ ...formData, price_per_minute: value });
                    }
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Compatible Devices
                </label>
                <div className="flex flex-wrap gap-2">
                  {['PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleDeviceTypeToggle(type as DeviceType)}
                      className={`px-3 py-1 rounded-full text-sm transition ${
                        formData.compatible_devices?.includes(type as DeviceType)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <input
                    type="checkbox"
                    checked={formData.is_multiplayer}
                    onChange={e => setFormData({ ...formData, is_multiplayer: e.target.checked })}
                    className="rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  Multiplayer Support
                </label>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
              >
                {editingGame ? 'Update Game' : 'Add Game'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingGame(null);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {games.map(game => (
          <div
            key={game.id}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {game.name}
                    {game.is_multiplayer && (
                      <Users className="h-4 w-4 text-purple-500" />
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                    <p className="text-sm text-slate-400">
                      Price: ${(game.price_per_minute || 0).toFixed(2)}/min
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {game.compatible_devices?.map(type => (
                        <span
                          key={type}
                          className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(game)}
                  className="p-2 text-slate-400 hover:text-white transition"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(game.id)}
                  className="p-2 text-red-400 hover:text-red-300 transition"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
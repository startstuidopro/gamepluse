import React, { useState, useEffect } from 'react';
import { Game, DeviceType } from '../../types';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { gameService } from '../../services/gameService';

export default function GameManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [_, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Game, 'id'> & { 
    id: number; 
    device_types: [DeviceType]
  }>({
    id: 0,
    name: '',
    price_per_minute: 0.5,
    image: '',
    device_types: ['PS5'], // Default to PS5 as tuple
    is_multiplayer: false 
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    const result = await gameService.getGames();
    if (result.success && result.data) {
      const games = Array.isArray(result.data) ? result.data : [result.data];
      setGames(games as Game[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(formData.price_per_minute) || formData.price_per_minute <= 0 || !formData.device_types.length) {
      return;
    }

    const gameData = {
      name: formData.name,
      price_per_minute: Number(formData.price_per_minute.toFixed(2)),
      image: formData.image,
      is_multiplayer: formData.is_multiplayer,
      device_types: formData.device_types
    };

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
      const result = await gameService.createGame(gameData, formData.device_types);
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
      device_types: ['PS5'], // Reset to default as tuple
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
      device_types: game.device_types.length ? [game.device_types[0]] : ['PS5'],
      is_multiplayer: game.is_multiplayer
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      const result = await gameService.deleteGame(id);
      if (result.success) {
        await loadGames();
      }
    }
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
              device_types: ['PS5'], // Reset to default as tuple
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
                  Image
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
                  Device Type
                </label>
                <select
                  value={formData.device_types[0] || ''} // Use first element for single selection
                  onChange={e => setFormData({ 
                    ...formData, 
                    device_types: e.target.value ? [e.target.value as DeviceType] : ['PS5'] // Ensure tuple format
                  })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select device</option>
                  <option value="PS5">PS5</option>
                  <option value="PS4">PS4</option>
                  <option value="Xbox Series X">Xbox Series X</option>
                  <option value="Xbox One">Xbox One</option>
                  <option value="Nintendo Switch">Nintendo Switch</option>
                </select>
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

      <div className="grid grid-cols-3 gap-4">
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
                    {game.device_types?.[0] && (
                      <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">
                        {game.device_types}
                      </span>
                    )}
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

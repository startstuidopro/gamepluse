import React, { useState } from 'react';
import { Controller, DeviceType } from '../../types';
import { Plus, Gamepad, Pencil, Trash2 } from 'lucide-react';

export default function ControllerManager() {
  const [controllers, setControllers] = useState<Controller[]>([
    {
      id: 1,
      name: 'PS5 Controller White',
      type: 'PS5',
      status: 'available',
      pricePerMinute: 0.1,
      color: 'White'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingController, setEditingController] = useState<Controller | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PS5' as DeviceType,
    pricePerMinute: 0.1,
    color: '',
    status: 'available' as Controller['status']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingController) {
      setControllers(controllers.map(c =>
        c.id === editingController.id
          ? { ...formData, id: editingController.id }
          : c
      ));
    } else {
      setControllers([...controllers, { ...formData, id: Date.now() }]);
    }
    setShowForm(false);
    setEditingController(null);
    setFormData({ name: '', type: 'PS5', pricePerMinute: 0.1, color: '', status: 'available' });
  };

  const handleEdit = (controller: Controller) => {
    setEditingController(controller);
    setFormData({
      name: controller.name,
      type: controller.type,
      pricePerMinute: controller.pricePerMinute,
      color: controller.color || '',
      status: controller.status
    });
    setShowForm(true);
  };

  const handleDelete = (controllerId: number) => {
    if (confirm('Are you sure you want to delete this controller?')) {
      setControllers(controllers.filter(c => c.id !== controllerId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Controller Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingController(null);
            setFormData({ name: '', type: 'PS5', pricePerMinute: 0.1, color: '', status: 'available' });
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
        >
          <Plus className="h-5 w-5" />
          Add Controller
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">
            {editingController ? 'Edit Controller' : 'Add New Controller'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as DeviceType })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="PS5">PlayStation 5</option>
                  <option value="PS4">PlayStation 4</option>
                  <option value="Xbox Series X">Xbox Series X</option>
                  <option value="Xbox One">Xbox One</option>
                  <option value="Nintendo Switch">Nintendo Switch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Price per Minute ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePerMinute}
                  onChange={e => setFormData({ ...formData, pricePerMinute: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as Controller['status'] })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
              >
                {editingController ? 'Update Controller' : 'Add Controller'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingController(null);
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
        {controllers.map(controller => (
          <div
            key={controller.id}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-full">
                  <Gamepad className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{controller.name}</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                    <p className="text-sm text-slate-400">Type: {controller.type}</p>
                    <p className="text-sm text-slate-400">Status: {controller.status}</p>
                    <p className="text-sm text-slate-400">Price: ${controller.pricePerMinute.toFixed(2)}/min</p>
                    {controller.color && (
                      <p className="text-sm text-slate-400">Color: {controller.color}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(controller)}
                  className="p-2 text-slate-400 hover:text-white transition"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(controller.id)}
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
import React, { useState, useEffect } from 'react';
import { Controller, DeviceType } from '../../types';
import { Plus, Gamepad, Pencil, Trash2 } from 'lucide-react';
import { ControllerModel } from '../../database/models/ControllerModel';

export default function ControllerManager() {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchControllers = async () => {
      try {
        const result = await ControllerModel.getInstance().findAvailable();       
        if (result.success && result.data) {
          setControllers(result.data);
        } else {
          setError(result.error || 'Failed to load controllers');
          setControllers([]);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchControllers();
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editingController, setEditingController] = useState<Controller | null>(null);
  const [formData, setFormData] = useState({
    identifier: '',
    name: '',
    type: 'PS5' as DeviceType,
    price_per_minute: 0.1,
    color: '',
    status: 'available' as Controller['status'],
    last_maintenance: new Date().toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingController) {
        const result = await ControllerModel.getInstance().update(
          editingController.id,
          formData
        );
        if (!result.success) throw new Error(result.error);
        
        const updatedControllers = controllers.map(c =>
          c.id === editingController.id ? { ...c, ...formData } : c
        );
        setControllers(updatedControllers);
      } else {
        const result = await ControllerModel.getInstance().create({
          ...formData,
          identifier: formData.identifier || `CTRL-${Date.now()}`,
          last_maintenance: new Date().toISOString()
        });
        
        if (!result.success || !result.data?.id) throw new Error(result.error);
        
        const newController = await ControllerModel.getInstance().findById(result.data.id);
        if (!newController.success || !newController.data) {
          throw new Error('Failed to fetch created controller');
        }
        
        setControllers([...controllers, newController.data]);
      }
      
      setShowForm(false);
      setEditingController(null);
      setFormData({ 
        identifier: '',
        name: '', 
        type: 'PS5', 
        price_per_minute: 0.1, 
        color: '', 
        status: 'available',
        last_maintenance: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving controller:', error);
      setError(error instanceof Error ? error.message : 'Failed to save controller');
    }
  };

  const handleEdit = (controller: Controller) => {
    setEditingController(controller);
    setFormData({
      identifier: controller.identifier,
      name: controller.name,
      type: controller.type,
      price_per_minute: controller.price_per_minute,
      color: controller.color || '',
      status: controller.status,
      last_maintenance: controller.last_maintenance
    });
    setShowForm(true);
  };

  const handleDelete = async (controllerId: number) => {
    if (typeof controllerId !== 'number') return;
    
    if (confirm('Are you sure you want to delete this controller?')) {
      try {
        const result = await ControllerModel.getInstance().delete(controllerId);
        if (!result.success) throw new Error(result.error);
        
        setControllers(controllers.filter(c => c.id !== controllerId));
      } catch (error) {
        console.error('Error deleting controller:', error);
        setError(error instanceof Error ? error.message : 'Failed to delete controller');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading controllers...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 p-4 rounded-lg text-red-500">
          Error: {error}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Controller Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingController(null);
            setFormData({ 
              identifier: '',
              name: '', 
              type: 'PS5', 
              price_per_minute: 0.1, 
              color: '', 
              status: 'available',
              last_maintenance: new Date().toISOString()
            });
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
                  Identifier
                </label>
                <input
                  type="text"
                  value={formData.identifier}
                  onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                  disabled={!!editingController}
                />
              </div>
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
                  value={formData.price_per_minute}
                  onChange={e => setFormData({ ...formData, price_per_minute: parseFloat(e.target.value) })}
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
                  Last Maintenance
                </label>
                <input
                  type="datetime-local"
                  value={formData.last_maintenance}
                  onChange={e => setFormData({ ...formData, last_maintenance: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
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

      <div className="grid grid-cols-3 gap-4">
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
                    <p className="text-sm text-slate-400">Price: ${controller.price_per_minute.toFixed(2)}/min</p>
                    {controller.color && (
                      <p className="text-sm text-slate-400">Color: {controller.color}</p>
                    )}
                    <p className="text-sm text-slate-400">Last Maintenance: {new Date(controller.last_maintenance).toLocaleDateString()}</p>
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
                  onClick={() => {
                    const controllerId = controller.id;
                    if (typeof controllerId === 'number' && !isNaN(controllerId)) {
                      handleDelete(controllerId);
                    } else {
                      console.error('Invalid controller ID:', controllerId);
                      setError('Invalid controller ID - cannot delete');
                      return;
                    }
                  }}
                  disabled={!controller.id || typeof controller.id !== 'number'}
                  className="p-2 text-red-400 hover:text-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

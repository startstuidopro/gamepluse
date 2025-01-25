import React, { useState, useEffect } from 'react';
import { Device, DeviceType } from '../../types';
import { Plus, Monitor, Pencil, Trash2, DollarSign } from 'lucide-react';
import { DeviceModel } from '../../database/models/DeviceModel';
const deviceModel = DeviceModel.getInstance();

export default function DeviceManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const result = await deviceModel.findAvailable();
        if (result.success && result.data) {
          setDevices(result.data);
        } else {
          setError(result.error || 'Failed to load devices');
        }
      } catch (err) {
        setError('Failed to load devices');
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    type: 'PS5' as DeviceType,
    location: '',
    status: 'available' as Device['status'],
    price_per_minute: 0.3
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        const result = await deviceModel.update(editingDevice.id, formData);
        if (result.success) {
          setDevices(devices.map(d =>
            d.id === editingDevice.id
              ? { ...d, ...formData }
              : d
          ));
        } else {
          setError(result.error || 'Failed to update device');
        }
      } else {
        const result = await deviceModel.create(formData);
        if (result.success && result.data) {
          const newDevice = { ...formData, id: result.data };
          setDevices([...devices, newDevice]);
        } else {
          setError(result.error || 'Failed to create device');
        }
      }
      setShowForm(false);
      setEditingDevice(null);
      setFormData({ name: '', type: 'PS5', location: '', status: 'available', price_per_minute: 0.3 });
    } catch (err) {
      setError('Failed to save device');
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      type: device.type,
      location: device.location,
      status: device.status,
      price_per_minute: device.price_per_minute
    });
    setShowForm(true);
  };

  const handleDelete = async (deviceId: number) => {
    try {
      if (confirm('Are you sure you want to delete this device?')) {
        const result = await deviceModel.updateStatus(deviceId, 'maintenance');
        if (result.success) {
          setDevices(devices.filter(d => d.id !== deviceId));
        } else {
          setError(result.error || 'Failed to delete device');
        }
      }
    } catch (err) {
      setError('Failed to delete device');
    }
  };

  return (
    <div className="space-y-6">
      {loading && <div className="text-white">Loading devices...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Device Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingDevice(null);
            setFormData({ name: '', type: 'PS5', location: '', status: 'available', price_per_minute: 0.3 });
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
        >
          <Plus className="h-5 w-5" />
          Add Device
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">
            {editingDevice ? 'Edit Device' : 'Add New Device'}
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
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
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
                  onChange={e => setFormData({ ...formData, status: e.target.value as Device['status'] })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Under Maintenance</option>
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
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
              >
                {editingDevice ? 'Update Device' : 'Add Device'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDevice(null);
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
        {devices.map(device => (
          <div
            key={device.id}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-full">
                  <Monitor className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{device.name}</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                    <p className="text-sm text-slate-400">Type: {device.type}</p>
                    <p className="text-sm text-slate-400">Location: {device.location}</p>
                    <p className="text-sm text-slate-400">Status: {device.status}</p>
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${device.price_per_minute.toFixed(2)}/min
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(device)}
                  className="p-2 text-slate-400 hover:text-white transition"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(device.id)}
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

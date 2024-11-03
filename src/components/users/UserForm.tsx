import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../../types';

interface UserFormProps {
  user: User | null;
  onSave: (user: User) => void;
  onCancel: () => void;
  isStaffForm?: boolean;
}

export default function UserForm({ user, onSave, onCancel, isStaffForm = false }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    membershipType: 'standard',
    role: 'staff' as UserRole,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        membershipType: user.membershipType,
        role: user.role,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        membershipType: 'standard',
        role: 'staff',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: user?.id ?? 0,
      ...formData,
      lastActive: new Date().toISOString(),
    });
    setFormData({
      name: '',
      email: '',
      membershipType: 'standard',
      role: 'staff',
    });
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 sticky top-4">
      <h2 className="text-xl font-bold text-white mb-6">
        {user ? 'Edit' : 'Add New'} {isStaffForm ? 'Staff Member' : 'User'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            required
          />
        </div>
        
        {isStaffForm ? (
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-400 mb-1">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="admin">Admin</option>
              <option value="accountant">Accountant</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="membershipType" className="block text-sm font-medium text-slate-400 mb-1">
              Membership Type
            </label>
            <select
              id="membershipType"
              value={formData.membershipType}
              onChange={e => setFormData({ ...formData, membershipType: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
          >
            {user ? 'Update' : 'Add'} {isStaffForm ? 'Staff Member' : 'User'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
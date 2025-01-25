import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../../types';
import { UserPlus } from 'lucide-react';

interface UserFormProps {
  user: User | null;
  onSave: (user: Omit<User, 'id'>) => void;
  onCancel: () => void;
  isStaffForm?: boolean;
}

export default function UserForm({ user, onSave, onCancel, isStaffForm = false }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    membershipType: 'standard' as 'standard' | 'premium',
    role: 'staff' as UserRole,
    credit: 0
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        phone: user.phone,
        password: '',
        membershipType: user.membership_type,
        role: user.role,
        credit: user.credit
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        password: '',
        membershipType: 'standard',
        role: isStaffForm ? 'staff' : 'customer',
        credit: 0
      });
    }
  }, [user, isStaffForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, hash the password before sending
    const userData = {
      ...formData,
      membership_type: formData.membershipType,
      password_hash: formData.password // In production, hash this!
    };
    
    onSave(userData);
    setFormData({
      name: '',
      phone: '',
      password: '',
      membershipType: 'standard',
      role: isStaffForm ? 'staff' : 'customer',
      credit: 0
    });
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 sticky top-4">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="h-6 w-6 text-purple-500" />
        <h2 className="text-xl font-bold text-white">
          {user ? 'Edit' : 'Add New'} {isStaffForm ? 'Staff Member' : 'User'}
        </h2>
      </div>

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
          <label htmlFor="phone" className="block text-sm font-medium text-slate-400 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            required
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1">
            {user ? 'New Password (leave empty to keep current)' : 'Password'}
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            required={!user}
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
              <option value="staff">Staff</option>
            </select>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="membershipType" className="block text-sm font-medium text-slate-400 mb-1">
                Membership Type
              </label>
              <select
                id="membershipType"
                value={formData.membershipType}
                onChange={e => setFormData({ ...formData, membershipType: e.target.value as 'standard' | 'premium' })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label htmlFor="credit" className="block text-sm font-medium text-slate-400 mb-1">
                Credit Balance ($)
              </label>
              <input
                type="number"
                id="credit"
                value={formData.credit}
                onChange={e => setFormData({ ...formData, credit: parseFloat(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
                min="0"
                step="0.01"
              />
            </div>
          </>
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
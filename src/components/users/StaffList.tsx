import React from 'react';
import { User } from '../../types';
import { Pencil, Trash2, Shield, Calculator, UserCircle } from 'lucide-react';

interface StaffListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
}

export default function StaffList({ users, onEdit, onDelete }: StaffListProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-400" />;
      case 'accountant':
        return <Calculator className="h-4 w-4 text-green-400" />;
      default:
        return <UserCircle className="h-4 w-4 text-blue-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-400';
      case 'accountant':
        return 'bg-green-500/10 text-green-400';
      default:
        return 'bg-blue-500/10 text-blue-400';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Staff Members</h2>
      <div className="space-y-4">
        {users.map(user => (
          <div
            key={user.id}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-full">
                  <span className="text-xl text-purple-500">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {user.name}
                    <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(user.role)} flex items-center gap-1`}>
                      {getRoleIcon(user.role)}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </h3>
                  <p className="text-slate-400">{user.phone}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Last active: {new Date(user.lastActive || '').toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(user)}
                  className="p-2 text-slate-400 hover:text-white transition"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onDelete(user.id)}
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
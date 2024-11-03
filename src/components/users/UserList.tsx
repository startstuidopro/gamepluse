import React from 'react';
import { User } from '../../types';
import { Pencil, Trash2, Crown } from 'lucide-react';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
}

export default function UserList({ users, onEdit, onDelete }: UserListProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Users</h2>
      <div className="space-y-4">
        {users.map(user => (
          <div
            key={user.id}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="bg-purple-500/10 p-3 rounded-full">
                <span className="text-xl text-purple-500">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  {user.name}
                  {user.membershipType === 'premium' && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </h3>
                <p className="text-slate-400">{user.email}</p>
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
        ))}
      </div>
    </div>
  );
}
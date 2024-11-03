import React, { useState } from 'react';
import { User } from '../../types';
import UserList from './UserList';
import UserForm from './UserForm';
import StaffList from './StaffList';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    { 
      id: 1, 
      name: 'Alex Mitchell', 
      email: 'alex@example.com', 
      membershipType: 'premium',
      role: 'admin',
      lastActive: '2024-03-15T10:30:00'
    },
    { 
      id: 2, 
      name: 'Sarah Kim', 
      email: 'sarah@example.com', 
      membershipType: 'standard',
      role: 'accountant',
      lastActive: '2024-03-15T09:45:00'
    },
    { 
      id: 3, 
      name: 'John Doe', 
      email: 'john@example.com', 
      membershipType: 'premium',
      role: 'staff',
      lastActive: '2024-03-15T11:15:00'
    },
  ]);

  const [activeView, setActiveView] = useState<'customers' | 'staff'>('customers');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleSave = (user: User) => {
    if (editingUser) {
      setUsers(users.map(u => u.id === user.id ? user : u));
    } else {
      setUsers([...users, { ...user, id: Math.max(...users.map(u => u.id)) + 1 }]);
    }
    setEditingUser(null);
  };

  const handleDelete = (userId: number) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const staffUsers = users.filter(user => ['admin', 'accountant', 'staff'].includes(user.role));
  const customerUsers = users.filter(user => !['admin', 'accountant', 'staff'].includes(user.role));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('customers')}
            className={`px-4 py-2 rounded-lg transition ${
              activeView === 'customers'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => setActiveView('staff')}
            className={`px-4 py-2 rounded-lg transition ${
              activeView === 'staff'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Staff Management
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeView === 'customers' ? (
            <UserList
              users={customerUsers}
              onEdit={setEditingUser}
              onDelete={handleDelete}
            />
          ) : (
            <StaffList
              users={staffUsers}
              onEdit={setEditingUser}
              onDelete={handleDelete}
            />
          )}
        </div>
        <div>
          <UserForm
            user={editingUser}
            onSave={handleSave}
            onCancel={() => setEditingUser(null)}
            isStaffForm={activeView === 'staff'}
          />
        </div>
      </div>
    </div>
  );
}
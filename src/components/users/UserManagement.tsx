import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import UserList from './UserList';
import UserForm from './UserForm';
import StaffList from './StaffList';
import db from '../../database';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Users } from 'lucide-react';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'customers' | 'staff'>('customers');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await db.waitForInit();
      const results = await db.query<User>(`
        SELECT 
          id,
          name,
          phone,
          role,
          membership_type as membershipType,
          credit,
          last_active as lastActive
        FROM users
        ORDER BY name ASC
      `);
      setUsers(results);
    } catch (err) {
      setError('Failed to load users. Please try again.');
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (userData: Omit<User, 'id'>) => {
    try {
      setError(null);
      if (editingUser) {
        await db.run(`
          UPDATE users 
          SET name = ?, 
              phone = ?, 
              role = ?, 
              membership_type = ?, 
              credit = ?,
              password_hash = COALESCE(?, password_hash)
          WHERE id = ?
        `, [
          userData.name,
          userData.phone,
          userData.role,
          userData.membershipType,
          userData.credit,
          userData.password_hash || null,
          editingUser.id
        ]);

        const updated = await db.get<User>(`
          SELECT 
            id, name, phone, role, 
            membership_type as membershipType, 
            credit, last_active as lastActive
          FROM users 
          WHERE id = ?
        `, [editingUser.id]);

        if (updated) {
          setUsers(users.map(u => u.id === updated.id ? updated : u));
        }
      } else {
        const result = await db.run(`
          INSERT INTO users (
            name, phone, password_hash, role, 
            membership_type, credit, last_active
          )
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          userData.name,
          userData.phone,
          userData.password_hash || '123456',
          userData.role,
          userData.membershipType,
          userData.credit
        ]);

        const created = await db.get<User>(`
          SELECT 
            id, name, phone, role, 
            membership_type as membershipType, 
            credit, last_active as lastActive
          FROM users 
          WHERE id = last_insert_rowid()
        `);

        if (created) {
          setUsers([...users, created]);
        }
      }
      setEditingUser(null);
    } catch (err) {
      setError('Failed to save user. Please try again.');
      console.error('Error saving user:', err);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setError(null);
      await db.run('DELETE FROM users WHERE id = ?', [userId]);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      setError('Failed to delete user. Please try again.');
      console.error('Error deleting user:', err);
    }
  };

  const staffUsers = users.filter(user => ['admin', 'accountant', 'staff'].includes(user.role));
  const customerUsers = users.filter(user => user.role === 'customer');

  if (!currentUser?.role === 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('customers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeView === 'customers'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Users className="h-5 w-5" />
            Customers
          </button>
          <button
            onClick={() => setActiveView('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeView === 'staff'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Shield className="h-5 w-5" />
            Staff Management
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
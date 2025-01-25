import  { useState, useEffect } from 'react';
import { User } from '../../types';
import UserList from './UserList';
import UserForm from './UserForm';
import StaffList from './StaffList';
import { getDatabase, waitForInit } from '../../database';
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
      await waitForInit();
      const db = await getDatabase();
      const results = await db.exec(`
        SELECT * FROM users ORDER BY name ASC
      `);
     
      const usersData = results[0]?.values.map(row => ({
        id: row[0],
        name: row[1],
        phone: row[2],
        role: row[4],
        membership_type: row[5],
        credit: row[6],
        last_active: row[7],
        created_at: row[8],
        updated_at: row[9]
      })) as User[];
      setUsers(usersData);
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
      const db = await getDatabase();
      if (editingUser) {
        await db.exec(`
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
          userData.membership_type,
          userData.credit,
          userData.password_hash || null,
          editingUser.id
        ]);

        const updatedResult = await db.exec(`
          SELECT * FROM users WHERE id = ?
        `, [editingUser.id]);

        if (updatedResult[0]?.values.length > 0) {
          const updated = updatedResult[0].values[0];
          const updatedUser = {
            id: updated[0],
            name: updated[1],
            phone: updated[2],
            role: updated[3],
            membership_type: updated[4],
            credit: updated[5],
            last_active: updated[6],
            created_at: updated[7],
            updated_at: updated[8]
          } as User;
          setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        }
      } else {
         await db.run(`
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
          userData.membership_type,
          userData.credit
        ]);

        const createdResult = await db.exec(`
          SELECT * FROM users WHERE id = last_insert_rowid()
        `);

        if (createdResult[0]?.values.length > 0) {
          const created = createdResult[0].values[0];
          const createdUser = {
            id: created[0],
            name: created[1],
            phone: created[2],
            role: created[3],
            membership_type: created[4],
            credit: created[5],
            last_active: created[6],
            created_at: created[7],
            updated_at: created[8]
          } as User;
          setUsers([...users, createdUser]);
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
      const db = await getDatabase();
      await db.exec('DELETE FROM users WHERE id = ?', [userId]);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      setError('Failed to delete user. Please try again.');
      console.error('Error deleting user:', err);
    }
  };
 
  const staffUsers = users.filter(user => ['admin', 'staff'].includes(user.role));
  const customerUsers = users.filter(user => user.role === 'customer');

  if (currentUser?.role !== 'admin') {
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
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import { useAuth } from './utils/auth';

const AdminDashboard = () => (
  <div>
    <h2>Admin Dashboard</h2>
    <button>Add User</button>
    {/* Add more admin-specific functionality here */}
  </div>
);

const StaffDashboard = () => (
  <div>
    <h2>Staff Dashboard</h2>
    {/* Add more staff-specific functionality here */}
  </div>
);

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {user ? (
          <>
            {user.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
            {user.role === 'staff' && <Route path="/staff" element={<StaffDashboard />} />}
            <Route path="/" element={<Navigate to={user.role === 'admin' ? '/admin' : '/staff'} />} />
          </>
        ) : (
          <Route path="/" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
};

export default App;

import React, { useState } from 'react';
import { useAuth } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import { getAllUsers } from '../utils/userDatabase';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear any previous errors

    try {
      const success = await login(username, password); // Await the login function
      // Retrieve all users and log to console
      const users = await getAllUsers();
      console.log('All users retrieved in handleLogin:', users); // Debugging statement
      if (success) {
        // Redirect based on user role (check user.role after successful login)
        if (user?.role === 'admin') { // Optional chaining
          navigate('/admin');
        } else if (user?.role === 'staff') {
          navigate('/staff');
        } else {
          navigate('/'); // Redirect to a default page if no specific role is found
        }


      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      setError('An error occurred during login.');
      console.error("Login error:", error);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-800">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700">Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition">Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

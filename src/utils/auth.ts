import { useState } from 'react';
import { readUser, readUserByUsername } from './userDatabase';

interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'staff';
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, password: string) => {
    try {
      const userData = await readUserByUsername(username);
      console.log('Retrieved user:', userData); // Debugging statement
      if (userData && password === userData.password) {
        const userById = await readUser(userData!.id);
        setUser({
          id: userById.id,
          username: userById.username,
          password: userById.password,
          role: 'admin', // Assuming role is 'admin' for simplicity
        });
        console.log('Login successful'); // Debugging statement
        return true;
      } else {
        console.log('Invalid username or password'); // Debugging statement
        return false;
      }
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return { user, login, logout };
};

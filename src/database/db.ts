import { useEffect } from 'react';
import { apiClient } from '../services/apiClient';

export async function getDatabaseStatus() {
  return await apiClient.getDatabaseStatus();
}

export async function waitForInit() {
  let attempts = 0;
  while (attempts++ < 10) {
    const status = await getDatabaseStatus();
    if (status.connected) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Failed to connect to database server');
}

// Simple component to initialize database connection
const DbConnection = () => {
  useEffect(() => {
    waitForInit().catch(console.error);
  }, []);
  return null;
};

export default DbConnection;

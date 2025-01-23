import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { waitForInit } from './database';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// Initialize database before rendering
waitForInit().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </StrictMode>
  );
}).catch((error: Error) => {
  console.error('Failed to initialize application:', error);
  // Show error message to user
  const errorElement = document.createElement('div');
  errorElement.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1e293b;color:#f1f5f9;padding:2rem;text-align:center;';
  errorElement.innerHTML = `
    <div>
      <h1 style="font-size:1.5rem;font-weight:bold;margin-bottom:1rem;">Failed to Initialize Application</h1>
      <p>Please refresh the page to try again. If the problem persists, contact support.</p>
    </div>
  `;
  document.body.appendChild(errorElement);
});
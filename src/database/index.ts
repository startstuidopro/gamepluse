export { default as DbConnection } from './db';
export { getDatabase, waitForInit } from './db';

// Default export for backward compatibility
export { getDatabase as default } from './db';
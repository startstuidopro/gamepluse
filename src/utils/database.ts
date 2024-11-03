import localforage from 'localforage';

const store = localforage.createInstance({
  name: 'my-app-db',
  storeName: 'sessions', // Name of the table-like structure
});

export const initializeDatabase = async () => {
  try {
    await store.ready();
    console.log('Database connection established');
  } catch (error) {
    console.error('Error initializing database connection:', error);
  }
};

export const addSessionToDatabase = async (sessionData: any) => {
  try {
    await store.setItem(sessionData.id.toString(), sessionData); // Use session ID as key
    console.log('Session added to database successfully');
  } catch (error) {
    console.error('Error adding session to database:', error);
  }
};

export const getSessionFromDatabase = async (sessionId: number, callback: (err: Error | null, row?: any) => void) => {
  try {
    const row = await store.getItem(sessionId.toString());
    if (row) {
      callback(null, row);
    } else {
      callback(new Error('Session not found'), null);
    }
  } catch (error) {
    console.error('Error retrieving session from database:', error);
    callback(error as Error, null);
  }
};

export const updateSessionInDatabase = async (sessionId: number, updatedData: any, callback: (err: Error | null) => void) => {
  try {
    await store.setItem(sessionId.toString(), updatedData);
    console.log('Session updated in database successfully');
    callback(null);
  } catch (error) {
    console.error('Error updating session in database:', error);
    callback(error as Error);
  }
};

export const deleteSessionFromDatabase = async (sessionId: number, callback: (err: Error | null) => void) => {
  try {
    await store.removeItem(sessionId.toString());
    callback(null);
  } catch (error) {
    console.error('Error deleting session from database:', error);
    callback(error as Error);
  }
};

import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";
import sqliteUrl from "/assets/sql-wasm.wasm?url";


// Seed database initialization
async function initializeSeed(db: Database) {
  const { seedDatabase } = await import('./seed');
  await seedDatabase(db);
}

// IndexedDB storage functions
async function saveDatabaseToStorage(db: Database): Promise<void> {
  try {
    const data = db.export();
    const request = indexedDB.open('GamePlusDatabase', 1);
    
    await new Promise<void>((resolve, reject) => {
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };

      request.onsuccess = () => {
        const tx = request.result.transaction('database', 'readwrite');
        const store = tx.objectStore('database');
        store.put(data, 'sqlite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

async function loadDatabaseFromStorage(): Promise<Uint8Array | null> {
  try {
    const request = indexedDB.open('GamePlusDatabase', 1);
    
    return await new Promise((resolve, reject) => {
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };

      request.onsuccess = () => {
        const tx = request.result.transaction('database', 'readonly');
        const store = tx.objectStore('database');
        const getRequest = store.get('sqlite');
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? new Uint8Array(result) : null);
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading database:', error);
    return null;
  }
}

// Singleton database instance
let dbInstance: Database;

// Initialize database with schema
async function initializeDatabase(): Promise<Database> {
  try {
    const SQL = await initSqlJs({ locateFile: () => sqliteUrl });
    
    let db: Database;
    // Try to load from IndexedDB
    const savedDb = await loadDatabaseFromStorage();
    if (savedDb) {
      db = new SQL.Database(savedDb);
      try {
        // Verify database integrity
        db.exec('SELECT 1 FROM users LIMIT 1');
        console.log('Loaded database from browser storage');
      } catch (error) {
        console.warn('Invalid database in storage, creating new one');
        db = new SQL.Database();
        await initializeSeed(db);
        await saveDatabaseToStorage(db);
      }
    } else {
      // Create fresh database
      db = new SQL.Database();
      await initializeSeed(db);
      await saveDatabaseToStorage(db);
      console.log('Created new database');
    }
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'accountant', 'staff', 'customer')) NOT NULL,
        membership_type TEXT CHECK(membership_type IN ('standard', 'premium')) NOT NULL,
        credit DECIMAL(10, 2) DEFAULT 0.00,
        last_active DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch')) NOT NULL,
        status TEXT CHECK(status IN ('available', 'occupied', 'maintenance')) NOT NULL,
        location TEXT NOT NULL,
        price_per_minute DECIMAL(10, 2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS controllers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch')) NOT NULL,
        status TEXT CHECK(status IN ('available', 'in-use', 'maintenance')) NOT NULL,
        price_per_minute DECIMAL(10, 2) NOT NULL,
        color TEXT,
        identifier TEXT NOT NULL,
        last_maintenance DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price_per_minute DECIMAL(10, 2) NOT NULL,
        image TEXT NOT NULL,
        is_multiplayer BOOLEAN NOT NULL,
         is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS game_device_compatibility (
        game_id INTEGER,
        device_type TEXT CHECK(device_type IN ('PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch')),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        PRIMARY KEY (game_id, device_type)
 
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        game_id INTEGER,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        base_price DECIMAL(10, 2) NOT NULL,
        discount_rate DECIMAL(4, 2) NOT NULL,
        final_price DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS session_controllers (
        session_id INTEGER,
        controller_id INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (controller_id) REFERENCES controllers(id),
        PRIMARY KEY (session_id, controller_id)
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2) NOT NULL,
        category TEXT CHECK(category IN ('drinks', 'snacks', 'sweets')) NOT NULL,
        image TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        barcode TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price_per_unit DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS discount_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        membership_type TEXT CHECK(membership_type IN ('standard', 'premium')) NOT NULL,
        discount_type TEXT CHECK(discount_type IN ('devices', 'games', 'controllers', 'products')) NOT NULL,
        discount_rate DECIMAL(4, 2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(membership_type, discount_type)
      );

      -- Insert initial data
      INSERT OR IGNORE INTO users (name, phone, password_hash, role, membership_type, credit)
      VALUES ('Admin User', '+1234567890', '$2b$10$default_hash', 'admin', 'premium', 1000.00);

      INSERT OR IGNORE INTO discount_configs (membership_type, discount_type, discount_rate)
      VALUES 
        ('premium', 'devices', 0.20),
        ('premium', 'games', 0.15),
        ('premium', 'controllers', 0.10),
        ('premium', 'products', 0.05);
    `);

    
    dbInstance = db;
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Track initialization status
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Get database instance
export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
}

// Wait for database initialization
export async function waitForInit(): Promise<void> {
  if (dbInstance) return;
  if (!initPromise) {
    isInitializing = true;
    initPromise = initializeDatabase().then(() => {
      isInitializing = false;
    });
  }
  return initPromise;
}

const DbConnection = () => {
  const [__, setDb] = useState<Database | null>(null);
  const [_, setError] = useState<string>("");

  useEffect(() => {
    getDatabase()
      .then(setDb)
      .catch((error) => {
        if (error instanceof Error) {
          setError(`An error occurred: ${error.message}`);
        } else if (typeof error === "string") {
          setError(error);
        } else {
          setError("An unknown error occurred " + error);
        }
      });
  }, []);

  return null; 
};

export default DbConnection;

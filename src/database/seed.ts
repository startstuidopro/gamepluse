import { Database } from 'sql.js';
import { seedData } from './seedData';

export async function seedDatabase(db: Database) {
  const createTables = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'accountant', 'staff', 'customer')) NOT NULL,
      membership_type TEXT CHECK(membership_type IN ('standard', 'premium')) NOT NULL,
      credit REAL DEFAULT 0,
      last_active TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL,
      category TEXT CHECK(category IN ('drinks', 'snacks', 'sweets')) NOT NULL,
      image TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      barcode TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT CHECK(status IN ('available', 'occupied', 'maintenance')) NOT NULL,
      location TEXT NOT NULL,
      price_per_minute REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS controllers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT CHECK(status IN ('available', 'in-use', 'maintenance')) NOT NULL,
      price_per_minute REAL NOT NULL,
      color TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_per_minute REAL NOT NULL,
      image TEXT NOT NULL,
      device_types TEXT NOT NULL,
      is_multiplayer INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    // Create tables
    db.run(createTables);

    // Check if users table is empty
    const result = db.exec('SELECT COUNT(*) as count FROM users');
    const count = result[0].values[0][0] as number;

    // Seed initial data only if users table is empty
    if (count === 0) {
      // Insert default users
      db.run(`
        INSERT INTO users (name, phone, password_hash, role, membership_type, credit, last_active)
        VALUES
          ('Admin User', '+1234567890', '123456', 'admin', 'premium', 1000, CURRENT_TIMESTAMP),
          ('Staff User', '+1987654321', '123456', 'staff', 'standard', 500, CURRENT_TIMESTAMP)
      `);

      // Insert products
      for (const product of seedData.products) {
        db.run(`
          INSERT INTO products (name, price, cost, category, image, stock, barcode)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [product.name, product.price, product.cost, product.category, product.image, product.stock, product.barcode]);
      }

      // Insert devices
      for (const device of seedData.devices) {
        db.run(`
          INSERT INTO devices (name, type, status, location, price_per_minute)
          VALUES (?, ?, ?, ?, ?)
        `, [device.name, device.type, device.status, device.location, device.price_per_minute]);
      }

      // Insert controllers
      for (const controller of seedData.controllers) {
        db.run(`
          INSERT INTO controllers (name, type, status, price_per_minute, color)
          VALUES (?, ?, ?, ?, ?)
        `, [controller.name, controller.type, controller.status, controller.price_per_minute, controller.color || null]);
      }

      // Insert games
      for (const game of seedData.games) {
        db.run(`
          INSERT INTO games (name, price_per_minute, image, device_types, is_multiplayer)
          VALUES (?, ?, ?, ?, ?)
        `, [game.name, game.price_per_minute, game.image, JSON.stringify(game.compatible_devices), game.is_multiplayer ? 1 : 0]);
      }
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
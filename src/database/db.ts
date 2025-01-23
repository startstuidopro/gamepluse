import BetterSqlite3 from 'better-sqlite3';

const DB_FILE = 'database.db';
class DatabaseInstance {
    private static instance: Database;
    private static initializing: Promise<void> | null = null;

    private constructor() {}

    public static getInstance(): Database {
        if (!DatabaseInstance.instance) {
            DatabaseInstance.instance = new Database(DB_FILE);
            DatabaseInstance.instance.pragma('journal_mode = WAL');
            DatabaseInstance.instance.pragma('foreign_keys = ON');
            console.log('Database initialized successfully');
        }
        return DatabaseInstance.instance;
    }
}

let db: BetterSqlite3.Database;

async function getDatabase(): Promise<Database> {
    if (!db) {
        db = await DatabaseInstance.getInstance();
    }
    return db;
}

// Create tables
async function setupDatabase() {
    const db = await getDatabase();
    // Create tables
    db!.exec(`
        -- Users table
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

        -- Devices table
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

        -- Controllers table
        CREATE TABLE IF NOT EXISTS controllers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT CHECK(type IN ('PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch')) NOT NULL,
            status TEXT CHECK(status IN ('available', 'in-use', 'maintenance')) NOT NULL,
            price_per_minute DECIMAL(10, 2) NOT NULL,
            color TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Games table
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price_per_minute DECIMAL(10, 2) NOT NULL,
            image TEXT NOT NULL,
            is_multiplayer BOOLEAN NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Game device compatibility
        CREATE TABLE IF NOT EXISTS game_device_compatibility (
            game_id INTEGER,
            device_type TEXT CHECK(device_type IN ('PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch')),
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
            PRIMARY KEY (game_id, device_type)
        );

        -- Sessions table
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

        -- Session controllers
        CREATE TABLE IF NOT EXISTS session_controllers (
            session_id INTEGER,
            controller_id INTEGER,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (controller_id) REFERENCES controllers(id),
            PRIMARY KEY (session_id, controller_id)
        );

        -- Products table
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

        -- Orders table
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Order items table
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

        -- Discount configurations table
        CREATE TABLE IF NOT EXISTS discount_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            membership_type TEXT CHECK(membership_type IN ('standard', 'premium')) NOT NULL,
            discount_type TEXT CHECK(discount_type IN ('devices', 'games', 'controllers', 'products')) NOT NULL,
            discount_rate DECIMAL(4, 2) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(membership_type, discount_type)
        );

        -- Triggers for updated_at
        CREATE TRIGGER IF NOT EXISTS users_updated_at 
        AFTER UPDATE ON users
        BEGIN
            UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS devices_updated_at 
        AFTER UPDATE ON devices
        BEGIN
            UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS controllers_updated_at 
        AFTER UPDATE ON controllers
        BEGIN
            UPDATE controllers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS products_updated_at 
        AFTER UPDATE ON products
        BEGIN
            UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS orders_updated_at 
        AFTER UPDATE ON orders
        BEGIN
            UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Insert initial data
    db.exec(`
        -- Insert default admin user
        INSERT OR IGNORE INTO users (name, phone, password_hash, role, membership_type, credit)
        VALUES ('Admin User', '+1234567890', '$2b$10$default_hash', 'admin', 'premium', 1000.00);

        -- Insert default discount configurations
        INSERT OR IGNORE INTO discount_configs (membership_type, discount_type, discount_rate)
        VALUES 
            ('premium', 'devices', 0.20),
            ('premium', 'games', 0.15),
            ('premium', 'controllers', 0.10),
            ('premium', 'products', 0.05);
    `);

    console.log('Database setup completed successfully!');
}

// Initialize the database
setupDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
});

export default getDatabase;

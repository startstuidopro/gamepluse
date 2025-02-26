
import { seedData } from './seedData.js';

export default async function seedDatabase(db) {
    try {
        db.exec('BEGIN TRANSACTION');

        // Table creation and seeding logic from seed.ts
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin', 'staff', 'customer')) NOT NULL,
                membership_type TEXT CHECK(membership_type IN ('standard', 'premium')) NOT NULL,
                credit DECIMAL(10, 2) DEFAULT 0.00,
                last_active DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT CHECK(type IN ('PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch')) NOT NULL,
                status TEXT CHECK(status IN ('available', 'occupied', 'maintenance')) NOT NULL,
                location TEXT NOT NULL,
                price_per_minute DECIMAL(10, 2) NOT NULL,
                current_session_id INTEGER DEFAULT NULL,
                last_session_id INTEGER DEFAULT NULL,
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
                last_maintenance DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price_per_minute DECIMAL(10, 2) NOT NULL,
                device_types TEXT NOT NULL,
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
              station_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              game_id INTEGER NOT NULL,
              created_by INTEGER NOT NULL,
              start_time DATETIME NOT NULL,
              end_time DATETIME,
              base_price DECIMAL(10, 2) NOT NULL,
              discount_rate DECIMAL(4, 2) NOT NULL,
              final_price DECIMAL(10, 2) NOT NULL,
              total_amount DECIMAL(10, 2),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
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
        `);

        const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
        const countResult = countStmt.get();
        const count = countResult.count;

        if (count === 0) {
            // Insert default users
            db.exec(`
                INSERT INTO users (name, phone, password_hash, role, membership_type, credit, last_active)
                VALUES
                    ('Admin User', '+1234567890', '123456', 'admin', 'premium', 1000, CURRENT_TIMESTAMP),
                    ('Staff User', '+1987654321', '123456', 'staff', 'standard', 500, CURRENT_TIMESTAMP),
                    ('Customer User', '+1234567891', '123456', 'customer', 'standard', 500, CURRENT_TIMESTAMP),
                    ('Customer User1', '+1224567891', '123456', 'customer', 'premium', 500, CURRENT_TIMESTAMP)
            `);

            const productStmt = db.prepare(`
                INSERT INTO products (name, price, cost, category, image, stock, barcode)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            seedData.products.forEach(product => {
                productStmt.run(
                    product.name,
                    product.price,
                    product.cost,
                    product.category,
                    product.image,
                    product.stock,
                    product.barcode
                );
            });

            const stationStmt = db.prepare(`
                INSERT INTO stations (name, type, status, location, price_per_minute)
                VALUES (?, ?, ?, ?, ?)
            `);

            seedData.stations.forEach(station => {
                stationStmt.run(
                    station.name,
                    station.type,
                    station.status,
                    station.location,
                    station.price_per_minute
                );
            });

            const controllerStmt = db.prepare(`
                INSERT INTO controllers (name, type, status, price_per_minute, color, identifier, last_maintenance)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            seedData.controllers.forEach(controller => {
                controllerStmt.run(
                    controller.name,
                    controller.type,
                    controller.status,
                    controller.price_per_minute,
                    controller.color || null,
                    controller.identifier,
                    controller.last_maintenance
                );
            });

            const gameStmt = db.prepare(`
                INSERT INTO games (name, price_per_minute, image, device_types, is_multiplayer, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            seedData.games.forEach(game => {
                gameStmt.run(
                    game.name,
                    game.price_per_minute,
                    game.image,
                    JSON.stringify(game.device_types),
                    game.is_multiplayer ? 1 : 0,
                    game.is_active ? 1 : 0
                );
            });

            db.exec(`
                INSERT INTO sessions (station_id, user_id, game_id, created_by, start_time, base_price, discount_rate, final_price, total_amount)
                VALUES (1, 3, 1, 2, CURRENT_TIMESTAMP, 100, 0.1, 90, 90)
            `);

            db.exec(`
                INSERT INTO session_controllers (session_id, controller_id)
                VALUES (1, 1)
            `);

            db.exec(`
                UPDATE stations SET current_session_id = 1, status = 'occupied' WHERE id = 1
            `);
        }

        db.exec('COMMIT');
        console.log('Database seeded successfully');
    } catch (error) {
        db.exec('ROLLBACK');
        console.error('Error seeding database:', error);
        throw error;
    }
};

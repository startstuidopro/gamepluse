import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import seedDatabase from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize database
const db = new Database(path.join(__dirname, '../public/gameplus.db'));
console.log(db);
db.pragma('journal_mode = WAL');
// // Disable foreign key constraints
// db.pragma('foreign_keys = OFF');

// // Get database schema and drop all tables
// const tables = db.prepare(`
//     SELECT name FROM sqlite_master 
//     WHERE type='table' AND name NOT LIKE 'sqlite_%';
// `).all();

// tables.forEach((table) => {
//     db.prepare(`DROP TABLE IF EXISTS ${table.name};`).run();
// });

// // Re-enable foreign key constraints
// db.pragma('foreign_keys = ON');

// Apply schema and seed data
try {
    seedDatabase(db);
} catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
}

const app = express();
app.use(express.json());

// Export for testing/prod
export default app;

// Database API routes
app.get('/api/stations', (req, res) => {
    try {
        const stations = db.prepare('SELECT * FROM stations').all();
        res.json(stations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products', (req, res) => {
    try {
        const products = db.prepare('SELECT * FROM products').all();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle clean shutdown
process.on('SIGINT', () => {
    db.close();
    process.exit();
});

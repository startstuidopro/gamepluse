import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";
import sqliteUrl from "/assets/sql-wasm.wasm?url";

// Singleton database instance
let dbInstance: Database | null = null;

// Track initialization promise
let initPromise: Promise<void> | null = null;

// Initialize database with schema
async function initializeDatabase(): Promise<Database> {
    try {
        const SQL = await initSqlJs({ locateFile: () => sqliteUrl });
        const db = new SQL.Database();
        
        // Initialize schema and seed data
        const { seedDatabase } = await import('./seed');
        await seedDatabase(db);
        
        dbInstance = db;
        return db;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Get database instance
export async function getDatabase(): Promise<Database> {
    if (!dbInstance) {
        if (!initPromise) {
            initPromise = initializeDatabase().then(db => {
                dbInstance = db;
            });
        }
        await initPromise;
        if (!dbInstance) {
            throw new Error('Database initialization failed');
        }
    }
    return dbInstance;
}

// Wait for database initialization
export async function waitForInit(): Promise<void> {
    if (dbInstance) return;
    if (!initPromise) {
        initPromise = initializeDatabase().then(db => {
            dbInstance = db;
        });
    }
    await initPromise;
}

// React component for database connection
const DbConnection = () => {
    const [__, setDb] = useState<Database | null>(null);
    const [_, setError] = useState<string>("");

    useEffect(() => {
        getDatabase()
            .then(setDb)
            .catch((error) => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                setError(`Database connection error: ${errorMessage}`);
            });

        return () => {
            if (dbInstance) {
                dbInstance.close();
                dbInstance = null;
                initPromise = null;
            }
        };
    }, []);

    return null;
};

export default DbConnection;

// Handle cleanup
window.addEventListener('beforeunload', () => {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
        initPromise = null;
    }
});

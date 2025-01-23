import initSqlJs, { Database } from 'sql.js';
import { seedDatabase } from './seed';

class DatabaseManager {
  private db: Database | null = null;
  private initialized: boolean = false;
  private initializing: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.initializing) return this.initializing;

    this.initializing = (async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        });
        
        this.db = new SQL.Database();
        await seedDatabase(this.db);
        
        this.initialized = true;
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
      }
    })();

    return this.initializing;
  }

  async waitForInit(): Promise<void> {
    if (this.initialized) return;
    await this.initializing;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.waitForInit();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      
      const results: T[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        // Convert column names from snake_case to camelCase
        const camelCaseRow = Object.entries(row).reduce((acc, [key, value]) => {
          const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
          return { ...acc, [camelKey]: value };
        }, {});
        results.push(camelCaseRow as T);
      }
      stmt.free();
      
      return results;
    } catch (error) {
      console.error('Query error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    await this.waitForInit();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } catch (error) {
      console.error('Execute error:', error);
      throw new Error(`Database execute failed: ${error.message}`);
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.waitForInit();
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.run('BEGIN TRANSACTION');
      const result = await callback();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  getDatabase(): Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  exportData(): Uint8Array {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.export();
  }
}

const db = new DatabaseManager();
export default db;
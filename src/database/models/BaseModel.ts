import { Database } from 'sql.js';
import { getDatabase } from '../db';
import { QueryResult } from '../../types';

export class BaseModel {
    protected tableName: string;
    private db: Database | null = null;

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    protected async getDb(): Promise<Database> {
        if (!this.db) {
            this.db = await getDatabase();
        }
        return this.db;
    }

    protected async handleQuery<T>(callback: (db: Database) => Promise<QueryResult<T>>): Promise<QueryResult<T>> {
        try {
            const db = await this.getDb();
            const result = await callback(db);
            return result;
        } catch (error) {
            console.error(`Database error:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private statementCache: Map<string, {stmt: any, refCount: number}> = new Map();

    protected async prepareStatement(sql: string) {
        const db = await this.getDb();
        if (!this.statementCache.has(sql)) {
            const stmt = db.prepare(sql);
            this.statementCache.set(sql, {stmt, refCount: 1});
        } else {
            const cached = this.statementCache.get(sql);
            cached!.refCount++;
        }
        return this.statementCache.get(sql)!.stmt;
    }

    protected async freeStatement(sql: string) {
        if (this.statementCache.has(sql)) {
            const cached = this.statementCache.get(sql)!;
            cached.refCount--;
            if (cached.refCount <= 0) {
                cached.stmt.free();
                this.statementCache.delete(sql);
            }
        }
    }

    public async cleanup() {
        for (const [_, cached] of this.statementCache) {
            cached.stmt.free();
        }
        this.statementCache.clear();
    }

    protected async withStatement<T>(sql: string, callback: (stmt: any) => Promise<QueryResult<T>>): Promise<QueryResult<T>> {
        const stmt = await this.prepareStatement(sql);
        try {
            return await callback(stmt);
        } finally {
            await this.freeStatement(sql);
        }
    }

    protected async transaction<T>(callback: () => Promise<T>): Promise<T> {
        try {
            this.db.exec('BEGIN TRANSACTION');
            const result = await callback();
            this.db.exec('COMMIT');
            return result;
        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }

    public async findAll(): Promise<QueryResult<any[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM ${this.tableName}`,
                async (stmt) => {
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    return {
                        success: true,
                        data: results
                    };
                }
            );
        });
    }

    public async findById(id: number): Promise<QueryResult<any>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM ${this.tableName} WHERE id = ?`,
                async (stmt) => {
                    stmt.bind([id]);
                    return {
                        success: true,
                        data: stmt.step() ? stmt.getAsObject() : null
                    };
                }
            );
        });
    }

    public async create(data: Record<string, any>): Promise<QueryResult<any>> {
        return this.handleQuery(async (db) => {
            const columns = Object.keys(data).join(', ');
            const values = Object.values(data);
            const placeholders = values.map(() => '?').join(', ');
            
            const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
         
            
            return this.withStatement(
                sql,
                async (stmt) => {
                    try {
                        stmt.bind(values);
                        const result = stmt.step();
                        if (!result) {
                            throw new Error('Failed to insert record');
                        }
                        const lastIdResult = db.exec('SELECT last_insert_rowid()');
                        if (!lastIdResult.length || !lastIdResult[0].values.length) {
                            throw new Error('Failed to get last insert ID');
                        }
                        const lastId = Number(lastIdResult[0].values[0][0]);
                        if (isNaN(lastId)) {
                            throw new Error('Invalid last insert ID');
                        }
                        return this.findById(lastId);
                    } catch (error) {
                        console.error('Error executing statement:', error);
                        throw error;
                    }
                }
            );
        });
    }

    public async update(id: number, data: Record<string, any>): Promise<QueryResult<any>> {
        return this.handleQuery(async () => {
            const setClause = Object.keys(data)
                .map(key => `${key} = ?`)
                .join(', ');
            const values = Object.values(data);
            
            return this.withStatement(
                `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
                async (stmt) => {
                    stmt.bind([...values, id]);
                    stmt.step();
                    return this.findById(id);
                }
            );
        });
    }

    public async delete(id: number): Promise<QueryResult<boolean>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `DELETE FROM ${this.tableName} WHERE id = ?`,
                async (stmt) => {
                    stmt.bind([id]);
                    stmt.step();
                        return {
                            success: true,
                            data: true
                        };
                }
            );
        });
    }
}

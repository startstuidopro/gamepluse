import { BaseModel } from './BaseModel';
import { Station, QueryResult } from '../../types';
import type { Database, Statement } from 'sql.js';

interface StationModelStatements {
    updateSessionStmt: Statement;
}

export class StationModel extends BaseModel {
    private static instance: StationModel;
    private statements: Partial<StationModelStatements> = {};

    private constructor() {
        super('stations');
        this.initStatements().catch(err => {
            console.error('Failed to initialize statements:', err);
        });
    }

    public static async getInstance(): Promise<StationModel> {
        if (!StationModel.instance) {
            StationModel.instance = new StationModel();
            await StationModel.instance.initStatements();
        }
        return StationModel.instance;
    }

    private async initStatements() {
        const db = await this.getDb();
        
        try {
            this.statements = {
                updateSessionStmt: db.prepare(`
                    UPDATE stations 
                    SET current_session_id = ?,
                        status = CASE 
                            WHEN ? IS NULL THEN 'available' 
                            ELSE 'occupied' 
                        END
                    WHERE id = ?
                `)
            };
        } catch (error) {
            console.error('Error initializing statements:', error);
            throw error;
        }
    }

    async updateSession(stationId: number, sessionId: number | null): Promise<QueryResult<void>> {
        return this.handleQuery<void>(async () => {
            if (!this.statements.updateSessionStmt) {
                throw new Error('updateSessionStmt not initialized');
            }

            // Convert values to proper types for binding
            const bindValues = [
                sessionId === null ? null : Number(sessionId),
                sessionId === null ? null : Number(sessionId),
                Number(stationId)
            ];

            console.log('Binding values:', bindValues); // Debug log

            this.statements.updateSessionStmt.reset();
            this.statements.updateSessionStmt.bind(bindValues);
            this.statements.updateSessionStmt.step();

            return {
                success: true,
                changes: 1
            };
        });
    }

    async getAll(): Promise<QueryResult<Station[]>> {
        return this.handleQuery<Station[]>(async () => {
            const db = await this.getDb();
            const stmt = db.prepare(`
                SELECT s.*, 
                       COALESCE(ses.id, NULL) as current_session_id
                FROM stations s
                LEFT JOIN sessions ses ON s.current_session_id = ses.id
                WHERE ses.end_time IS NULL OR ses.end_time IS NULL
            `);

            const stations = [];
            while (stmt.step()) {
                stations.push(stmt.getAsObject());
            }
            stmt.free();

            return {
                success: true,
                data: stations.map(station => ({
                    ...station,
                    id: Number(station.id),
                    price_per_minute: Number(station.price_per_minute),
                    current_session_id: station.current_session_id ? Number(station.current_session_id) : null
                }))
            };
        });
    }

    async getById(id: number): Promise<QueryResult<Station>> {
        return this.handleQuery<Station>(async () => {
            const db = await this.getDb();
            const stmt = db.prepare(`
                SELECT s.*, 
                       COALESCE(ses.id, NULL) as current_session_id
                FROM stations s
                LEFT JOIN sessions ses ON s.current_session_id = ses.id
                WHERE s.id = ? AND (ses.end_time IS NULL OR ses.end_time IS NULL)
            `);

            stmt.bind([Number(id)]);
            const hasRow = stmt.step();
            if (!hasRow) {
                return {
                    success: true,
                    data: undefined
                };
            }

            const station = stmt.getAsObject();
            stmt.free();

            return {
                success: true,
                data: {
                    ...station,
                    id: Number(station.id),
                    price_per_minute: Number(station.price_per_minute),
                    current_session_id: station.current_session_id ? Number(station.current_session_id) : null
                }
            };
        });
    }
} 
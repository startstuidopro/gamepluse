import { BaseModel } from './BaseModel';
import { Session, QueryResult } from '../../types';

interface SessionModelStatements {
    createStmt: any;
    createControllerStmt: any;
    deleteControllerStmt: any;
    getControllersStmt: any;
    endSessionStmt: any;
    getActiveSessionStmt: any;
}

export class SessionModel extends BaseModel implements SessionModelStatements {
    private static instance: SessionModel;

    // Declare statement properties with proper types
    createStmt!: any;
    createControllerStmt!: any;
    deleteControllerStmt!: any;
    getControllersStmt!: any;
    endSessionStmt!: any;
    getActiveSessionStmt!: any;

    private constructor() {
        super('sessions');
        this.initStatements().catch(err => {
            console.error('Failed to initialize statements:', err);
        });
    }

    public static async getInstance(): Promise<SessionModel> {
        if (!SessionModel.instance) {
            SessionModel.instance = new SessionModel();
            await SessionModel.instance.initStatements();
        }
        return SessionModel.instance;
    }

    private async initStatements() {
        try {
            interface StatementConfig {
                name: keyof SessionModelStatements;
                sql: string;
            }

            const statements: StatementConfig[] = [
                {
                    name: 'createStmt',
                    sql: `INSERT INTO sessions (device_id, user_id, game_id, start_time, base_price, discount_rate, final_price)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`
                },
                {
                    name: 'createControllerStmt',
                    sql: `INSERT INTO session_controllers (session_id, controller_id) VALUES (?, ?)`
                },
                {
                    name: 'deleteControllerStmt',
                    sql: `DELETE FROM session_controllers WHERE session_id = ?`
                },
                {
                    name: 'getControllersStmt',
                    sql: `SELECT c.* FROM controllers c
                          JOIN session_controllers sc ON c.id = sc.controller_id
                          WHERE sc.session_id = ?`
                },
                {
                    name: 'endSessionStmt',
                    sql: `UPDATE sessions
                          SET end_time = ?, total_amount = ?
                          WHERE id = ? AND end_time IS NULL`
                },
                {
                    name: 'getActiveSessionStmt',
                    sql: `SELECT s.*,
                                 u.name as user_name,
                                 d.name as device_name,
                                 d.type as device_type,
                                 g.name as game_name
                          FROM sessions s
                          LEFT JOIN users u ON s.user_id = u.id
                          LEFT JOIN devices d ON s.device_id = d.id
                          LEFT JOIN games g ON s.game_id = g.id
                          WHERE s.end_time IS NULL AND s.device_id = ?`
                }
            ];

            // Initialize all statements in parallel
            await Promise.all(statements.map(async (stmt) => {
                (this as any)[stmt.name] = await this.prepareStatement(stmt.sql);
                console.log(`Initialized statement: ${stmt.name}`);
            }));

            console.log('All statements initialized successfully');
        } catch (error) {
            console.error('Error initializing statements:', error);
            throw error;
        }
    }

    private async ensureStatementsInitialized() {
        if (!this.getActiveSessionStmt || !this.getControllersStmt) {
            console.log('Reinitializing statements...');
            await this.initStatements();
        }
    }

    async create(session: Omit<Session, 'id' | 'end_time' | 'total_amount'>, controllerIds?: number[]): Promise<QueryResult<number>> {
        return this.handleQuery(async () => {
            return this.transaction(async () => {
                try {
                    // Create session
                    const result = await this.createStmt.run(
                        session.device_id,
                        session.user_id,
                        session.game_id,
                        session.start_time,
                        session.base_price,
                        session.discount_rate,
                        session.final_price
                    );

                    const sessionId = result.lastInsertRowid;

                    // Add controllers if provided
                    if (controllerIds?.length) {
                        for (const controllerId of controllerIds) {
                            try {
                                await this.createControllerStmt.run(sessionId, controllerId);
                            } catch (err) {
                                console.error(`Failed to add controller ${controllerId} to session ${sessionId}:`, err);
                                throw new Error(`Failed to add controller ${controllerId}`);
                            }
                        }
                    }

                    return {
                        success: true,
                        data: sessionId
                    };
                } catch (err) {
                    console.error('Failed to create session:', err);
                    return {
                        success: false,
                        error: err instanceof Error ? err.message : 'Failed to create session'
                    };
                }
            });
        });
    }

    async endSession(id: number, endTime: string, totalAmount: number): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            await this.endSessionStmt.run(endTime, totalAmount, id);
            return { success: true };
        });
    }

    async getActiveSession(deviceId: number): Promise<QueryResult<Session>> {
        return this.handleQuery(async () => {
            try {
                await this.ensureStatementsInitialized();
                
                console.log('Fetching active session for device:', deviceId);
                if (!this.getActiveSessionStmt) {
                    throw new Error('getActiveSessionStmt not initialized');
                }
                
                const session = await this.getActiveSessionStmt.get(deviceId);
                
                if (!session) {
                    console.log('No active session found for device:', deviceId);
                    return { success: true, data: null };
                }

                console.log('Found session:', session);
                
                if (!this.getControllersStmt) {
                    throw new Error('getControllersStmt not initialized');
                }
                
                const controllers = await this.getControllersStmt.all(session.id);
                console.log('Session controllers:', controllers);
                
                return {
                    success: true,
                    data: { ...session, attachedControllers: controllers }
                };
            } catch (error) {
                console.error('Error in getActiveSession:', error);
                throw error;
            }
        });
    }

    async getAllActiveSessions(): Promise<QueryResult<Session[]>> {
        return this.handleQuery(async () => {
            const stmt = await this.prepareStatement(`
                SELECT s.*,
                       u.name as user_name,
                       d.name as device_name,
                       d.type as device_type,
                       g.name as game_name
                FROM sessions s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN devices d ON s.device_id = d.id
                LEFT JOIN games g ON s.game_id = g.id
                WHERE s.end_time IS NULL
            `);
            
            const sessions = await stmt.all();
            const results = [];
            
            for (const session of sessions) {
                const controllers = await this.getControllersStmt.all(session.id);
                results.push({
                    ...session,
                    attachedControllers: controllers
                });
            }
            
            return { success: true, data: results };
        });
    }

    async getUserSessions(userId: number): Promise<QueryResult<Session[]>> {
        return this.handleQuery(async () => {
            const stmt = await this.prepareStatement(`
                SELECT s.*,
                       d.name as device_name,
                       d.type as device_type,
                       g.name as game_name
                FROM sessions s
                LEFT JOIN devices d ON s.device_id = d.id
                LEFT JOIN games g ON s.game_id = g.id
                WHERE s.user_id = ?
                ORDER BY s.start_time DESC
            `);
            
            const sessions = await stmt.all(userId);
            const results = [];
            
            for (const session of sessions) {
                const controllers = await this.getControllersStmt.all(session.id);
                results.push({
                    ...session,
                    attachedControllers: controllers
                });
            }
            
            return { success: true, data: results };
        });
    }

    async addController(sessionId: number, controllerId: number): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            await this.createControllerStmt.run(sessionId, controllerId);
            return { success: true };
        });
    }

    async removeController(sessionId: number, controllerId: number): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            await this.deleteControllerStmt.run(sessionId, controllerId);
            return { success: true };
        });
    }

    async delete(id: number): Promise<QueryResult<boolean>> {
        return this.handleQuery(async () => {
            return this.transaction(async () => {
                await this.deleteControllerStmt.run(id);
                const stmt = await this.prepareStatement('DELETE FROM sessions WHERE id = ?');
                await stmt.run(id);
                return { success: true, data: true };
            });
        });
    }
}

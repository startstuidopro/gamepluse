import { BaseModel } from './BaseModel';
import { Session, QueryResult, DeviceType, ControllerStatus } from '../../types';

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
            }));
        } catch (error) {
            console.error('Error initializing statements:', error);
            throw error;
        }
    }

    private async ensureStatementsInitialized() {
        if (!this.getActiveSessionStmt || !this.getControllersStmt) {
            await this.initStatements();
        }
    }

    async create(session: Omit<Session, 'id' | 'end_time' | 'total_amount'>, controllerIds?: number[]): Promise<QueryResult<number>> {
        return this.handleQuery<number>(async () => {
            return this.transaction(async () => {
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

                const sessionId = Number(result.lastInsertRowid);

                // Add controllers if provided
                if (controllerIds?.length) {
                    for (const controllerId of controllerIds) {
                        await this.createControllerStmt.run(sessionId, controllerId);
                    }
                }

                return {
                    success: true,
                    data: sessionId,
                    lastInsertId: sessionId
                };
            });
        });
    }

    async endSession(id: number, endTime: string, totalAmount: number): Promise<QueryResult<void>> {
        return this.handleQuery<void>(async () => {
            const result = await this.endSessionStmt.run(endTime, totalAmount, id);
            return {
                success: result.changes > 0,
                changes: result.changes
            };
        });
    }

    async getActiveSession(deviceId: number): Promise<QueryResult<Session>> {
        return this.handleQuery<Session>(async () => {
            try {
                // Strengthen parameter validation
                    if (deviceId === null || deviceId === undefined || typeof deviceId !== 'number' || isNaN(deviceId)) {
                    throw new Error('Invalid device ID: must be a valid number');
                }

                await this.ensureStatementsInitialized();
                
                if (!this.getActiveSessionStmt) {
                    throw new Error('getActiveSessionStmt not initialized');
                }
                
                // Reset statement before use
                this.getActiveSessionStmt.reset();
                
                // Bind parameter and execute query
                this.getActiveSessionStmt.bind([deviceId]);
                const session = this.getActiveSessionStmt.getAsObject();
                
                if (!session) {
                    return {
                        success: true,
                        data: undefined
                    };
                }

                if (!this.getControllersStmt) {
                    throw new Error('getControllersStmt not initialized');
                }
                
                // Reset statement before use
                this.getControllersStmt.reset();
                
                // Bind parameters and execute query
                this.getControllersStmt.bind([session.id]);
                const controllers = [];
                while (this.getControllersStmt.step()) {
                    controllers.push(this.getControllersStmt.getAsObject());
                }
                
                const typedSession = {
                    id: Number(session.id),
                    device_id: Number(session.device_id),
                    user_id: Number(session.user_id),
                    game_id: session.game_id ? Number(session.game_id) : undefined,
                    start_time: session.start_time,
                    end_time: session.end_time || undefined,
                    base_price: Number(session.base_price),
                    discount_rate: Number(session.discount_rate),
                    final_price: Number(session.final_price),
                    total_amount: session.total_amount ? Number(session.total_amount) : undefined,
                    price_per_minute: Number(session.price_per_minute || 0),
                    attached_controllers: controllers.map(c => ({
                        id: Number(c.id),
                        name: String(c.name),
                        type: c.type as DeviceType,
                        status: c.status as ControllerStatus,
                        price_per_minute: Number(c.price_per_minute),
                        color: c.color || undefined,
                        identifier: c.identifier || '',
                        last_maintenance: c.last_maintenance || ''
                    })),
                    user_membership_type: session.user_membership_type as 'standard' | 'premium' | undefined,
                    game: session.game_name ? {
                        id: Number(session.game_id),
                        name: String(session.game_name),
                        price_per_minute: Number(session.price_per_minute),
                        image: '',
                        device_types: [],
                        is_multiplayer: false
                    } : undefined
                };

                return {
                    success: true,
                    data: typedSession
                } as QueryResult<Session>;
            } catch (error) {
                console.error('Error in getActiveSession:', error);
                throw error;
            }
        });
    }

    async getAllActiveSessions(): Promise<QueryResult<Session[]>> {
        return this.handleQuery<Session[]>(async () => {
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
            const results = sessions.map((s: any) => ({
                ...s,
                price_per_minute: Number(s.price_per_minute || 0)
            }));
            
            return {
                success: true,
                data: results
            } as QueryResult<Session[]>;
        });
    }

    async getUserSessions(userId: number): Promise<QueryResult<Session[]>> {
        return this.handleQuery<Session[]>(async () => {
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
            const results = sessions.map((s: Session) => ({
                ...s,
                price_per_minute: Number(s.price_per_minute || 0)
            }));
            
            return {
                success: true,
                data: results
            } as QueryResult<Session[]>;
        });
    }

    async addController(sessionId: number, controllerId: number): Promise<QueryResult<void>> {
        return this.handleQuery<void>(async () => {
            const result = await this.createControllerStmt.run(sessionId, controllerId);
            return {
                success: true,
                changes: result.changes
            } as QueryResult<void>;
        });
    }

    async removeController(sessionId: number, controllerId: number): Promise<QueryResult<void>> {
        return this.handleQuery<void>(async () => {
            const result = await this.deleteControllerStmt.run(sessionId, controllerId);
            return {
                success: true,
                changes: result.changes
            } as QueryResult<void>;
        });
    }

    async delete(id: number): Promise<QueryResult<boolean>> {
        return this.handleQuery<boolean>(async () => {
            return this.transaction(async () => {
                await this.deleteControllerStmt.run(id);
                const stmt = await this.prepareStatement('DELETE FROM sessions WHERE id = ?');
                const result = await stmt.run(id);
                return {
                    success: result.changes > 0,
                    data: result.changes > 0,
                    changes: result.changes
                };
            });
        });
    }
}

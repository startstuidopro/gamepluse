import { BaseModel } from './BaseModel';
import { Session, QueryResult, DeviceType, ControllerStatus, Controller } from '../../types';
import { Database } from 'sql.js';

interface SessionModelStatements {
    getSessionStmt: Database.Statement;
    createStmt: Database.Statement;
    createControllerStmt: Database.Statement;
    deleteControllerStmt: Database.Statement;
    getControllersStmt: Database.Statement;
    endSessionStmt: Database.Statement;
    getActiveSessionStmt: Database.Statement;
}

export class SessionModel extends BaseModel {
    private static instance: SessionModel;
    private statements: Partial<SessionModelStatements> = {};

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
        const db = await this.getDb();
        
        try {
            this.statements = {
                getSessionStmt: db.prepare(`SELECT * FROM sessions`),
                
                createStmt: db.prepare(`
                    INSERT INTO sessions (
                        station_id, user_id, game_id, created_by, 
                        start_time, base_price, discount_rate, final_price
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `),
                
                createControllerStmt: db.prepare(`
                    INSERT INTO session_controllers (session_id, controller_id) 
                    VALUES (?, ?)
                `),
                
                deleteControllerStmt: db.prepare(`
                    DELETE FROM session_controllers WHERE session_id = ?
                `),
                
                getControllersStmt: db.prepare(`
                    SELECT c.* FROM controllers c
                    JOIN session_controllers sc ON c.id = sc.controller_id
                    WHERE sc.session_id = ?
                `),
                
                endSessionStmt: db.prepare(`
                    UPDATE sessions
                    SET end_time = ?, total_amount = ?
                    WHERE id = ? AND end_time IS NULL
                `),
                
                getActiveSessionStmt: db.prepare(`
                    SELECT 
                        s.*,
                        u.name as user_name,
                        u.membership_type as user_membership_type,
                        d.name as device_name,
                        d.type as device_type,
                        g.name as game_name,
                        g.price_per_minute as game_price_per_minute,
                        g.image as game_image,
                        g.device_types as game_device_types,
                        g.is_multiplayer as game_is_multiplayer
                    FROM sessions s
                    LEFT JOIN users u ON s.user_id = u.id
                    LEFT JOIN stations d ON s.station_id = d.id
                    LEFT JOIN games g ON s.game_id = g.id
                    WHERE s.end_time IS NULL AND s.station_id = ?
                `)
            };
        } catch (error) {
            console.error('Error initializing statements:', error);
            throw error;
        }
    }

    async create(session: Omit<Session, 'id' | 'end_time' | 'total_amount'> & { 
        station_id: number;
        user: { id: number };
        game: { id: number } | null;
        created_by: { id: number };
        start_time: Date | string;
        base_price: number;
        discount_rate: number; 
        final_price: number;
        attached_controllers: Controller[];
    }, controllerIds?: number[]): Promise<QueryResult<number>> {
        return this.handleQuery<number>(async () => {
            return this.transaction(async () => {
                const db = await this.getDb();
                // Validate required fields
                if (!session.station_id || typeof session.station_id !== 'number') {
                    throw new Error('Valid station_id is required');
                }

                const createStmt = this.statements.createStmt;
                if (!createStmt) {
                    throw new Error('Create statement not initialized');
                }

                // Bind parameters and execute
                createStmt.bind([
                    session.station_id,
                    session.user.id,
                    session.game?.id || null,
                    session.created_by.id,
                    typeof session.start_time === 'string' ? session.start_time : session.start_time.toISOString(),
                    session.base_price,
                    session.discount_rate,
                    session.final_price
                ]);
                
                createStmt.step();
                const sessionId = (db as Database).exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
                console.log('sessionId', sessionId);
                createStmt.reset();

                // Update station's current session
                
                const updateStationStmt = db.prepare(`
                    UPDATE stations 
                    SET current_session_id = ?, status = 'occupied' 
                    WHERE id = ?
                `);
                updateStationStmt.bind([sessionId, session.station_id]);
                updateStationStmt.step();
                updateStationStmt.free();

                // Add controllers if provided
                if (controllerIds?.length) {
                    const controllerStmt = this.statements.createControllerStmt;
                    if (!controllerStmt) {
                        throw new Error('Controller statement not initialized');
                    }
                    for (const controllerId of controllerIds) {
                        controllerStmt.bind([sessionId, controllerId]);
                        controllerStmt.step();
                        controllerStmt.reset();
                    }
                }

                return {
                    success: true,
                    data: sessionId
                };
            });
        });
    }

    async getActiveSession(deviceId: number): Promise<QueryResult<Session>> {
        return this.handleQuery<Session>(async () => {
            try {
                // Strengthen parameter validation
                if (deviceId === null || deviceId === undefined || typeof deviceId !== 'number' || isNaN(deviceId)) {
                    throw new Error('Invalid device ID: must be a valid number');
                }

                if (!this.statements.getActiveSessionStmt) {
                    throw new Error('getActiveSessionStmt not initialized');
                }
                
                // Reset statement before use
                this.statements.getActiveSessionStmt.reset();
                
                // Bind parameter and execute query
                this.statements.getActiveSessionStmt.bind([deviceId]);
                const hasRow = this.statements.getActiveSessionStmt.step();
                console.log('hasRow', hasRow)
                if (!hasRow) {
                    return {
                        success: true,
                        data: undefined
                    };
                }

                const session = this.statements.getActiveSessionStmt.getAsObject();
                
                if (!this.statements.getControllersStmt) {
                    throw new Error('getControllersStmt not initialized');
                }
                
                // Reset statement before use
                this.statements.getControllersStmt.reset();
                
                // Bind parameters and execute query
                this.statements.getControllersStmt.bind([session.id]);
                const controllers = [];
                while (this.statements.getControllersStmt.step()) {
                    controllers.push(this.statements.getControllersStmt.getAsObject());
                }
                
                const typedSession = {
                    id: Number(session.id),
                    station_id: Number(session.station_id),
                    user: {
                        id: Number(session.user_id),
                        name: String(session.user_name),
                        membership_type: session.user_membership_type as 'standard' | 'premium'
                    },
                    game: session.game_name ? {
                        id: Number(session.game_id),
                        name: String(session.game_name),
                        price_per_minute: Number(session.game_price_per_minute),
                        image: String(session.game_image),
                        device_types: JSON.parse(session.game_device_types),
                        is_multiplayer: Boolean(session.game_is_multiplayer)
                    } : undefined,
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
                    created_by: Number(session.created_by)
                };

                return {
                    success: true,
                    data: typedSession
                };
            } catch (error) {
                console.error('Error in getActiveSession:', error);
                throw error;
            }
        });
    }

    async getAllActiveSessions(): Promise<QueryResult<Session[]>> {
        return this.handleQuery<Session[]>(async () => {
            if (!this.statements.getSessionStmt) {
                throw new Error('getSessionStmt not initialized');
            }

            // Reset and execute statement
            this.statements.getSessionStmt.reset();
            const sessions = [];
            while (this.statements.getSessionStmt.step()) {
                const session = this.statements.getSessionStmt.getAsObject();
                sessions.push({
                    ...session,
                    price_per_minute: Number(session.price_per_minute || 0)
                });
            }

            return {
                success: true,
                data: sessions
            };
        });
    }

    async getUserSessions(userId: number): Promise<QueryResult<Session[]>> {
        return this.handleQuery<Session[]>(async () => {
            const db = await this.getDb();
            const stmt = db.prepare(`
                SELECT s.*,
                       d.name as device_name,
                       d.type as device_type,
                       g.name as game_name
                FROM sessions s
                LEFT JOIN stations d ON s.station_id = d.id
                LEFT JOIN games g ON s.game_id = g.id
                WHERE s.user_id = ?
                ORDER BY s.start_time DESC
            `);

            stmt.bind([userId]);
            const sessions = [];
            while (stmt.step()) {
                const session = stmt.getAsObject();
                sessions.push(session);
            }
            stmt.free();

            return {
                success: true,
                data: sessions
            };
        });
    }

    async addController(sessionId: number, controllerId: number): Promise<QueryResult<void>> {
        return this.handleQuery<void>(async () => {
            if (!this.statements.createControllerStmt) {
                throw new Error('createControllerStmt not initialized');
            }

            this.statements.createControllerStmt.reset();
            this.statements.createControllerStmt.bind([sessionId, controllerId]);
            this.statements.createControllerStmt.step();

            return {
                success: true,
                changes: 1
            };
        });
    }

    async removeController(sessionId: number, controllerId: number): Promise<QueryResult<void>> {
        return this.handleQuery<void>(async () => {
            if (!this.statements.deleteControllerStmt) {
                throw new Error('deleteControllerStmt not initialized');
            }

            this.statements.deleteControllerStmt.reset();
            this.statements.deleteControllerStmt.bind([sessionId, controllerId]);
            this.statements.deleteControllerStmt.step();

            return {
                success: true,
                changes: 1
            };
        });
    }

    async delete(id: number): Promise<QueryResult<boolean>> {
        return this.handleQuery<boolean>(async () => {
            return this.transaction(async () => {
                // First delete associated controllers
                if (!this.statements.deleteControllerStmt) {
                    throw new Error('deleteControllerStmt not initialized');
                }

                this.statements.deleteControllerStmt.reset();
                this.statements.deleteControllerStmt.bind([id]);
                this.statements.deleteControllerStmt.step();

                // Then delete the session
                const db = await this.getDb();
                const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
                stmt.bind([id]);
                stmt.step();
                stmt.free();

                return {
                    success: true,
                    data: true,
                    changes: 1
                };
            });
        });
    }

    async endSession(id: number, endTime: string, totalAmount: number): Promise<QueryResult<void>> {
        return this.handleQuery<void>(async () => {
            if (!this.statements.endSessionStmt) {
                throw new Error('endSessionStmt not initialized');
            }

            this.statements.endSessionStmt.reset();
            this.statements.endSessionStmt.bind([endTime, totalAmount, id]);
            this.statements.endSessionStmt.step();

            return {
                success: true,
                changes: 1
            };
        });
    }
}

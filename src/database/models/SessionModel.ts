import { BaseModel } from './BaseModel';
import { Session, QueryResult } from '../../types';

export class SessionModel extends BaseModel {
    private static instance: SessionModel;

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

    // Prepared statements
    private createStmt: any;
    private createControllerStmt: any;
    private deleteControllerStmt: any;
    private getControllersStmt: any;
    private endSessionStmt: any;
    private getActiveSessionStmt: any;

    private async initStatements() {
        this.createStmt = await this.prepareStatement(`
            INSERT INTO sessions (device_id, user_id, game_id, start_time, base_price, discount_rate, final_price)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        this.createControllerStmt = await this.prepareStatement(`
            INSERT INTO session_controllers (session_id, controller_id) VALUES (?, ?)
        `);
        
        this.deleteControllerStmt = await this.prepareStatement(`
            DELETE FROM session_controllers WHERE session_id = ?
        `);
        
        this.getControllersStmt = await this.prepareStatement(`
            SELECT c.* FROM controllers c
            JOIN session_controllers sc ON c.id = sc.controller_id
            WHERE sc.session_id = ?
        `);
        
        this.endSessionStmt = await this.prepareStatement(`
            UPDATE sessions
            SET end_time = ?, total_amount = ?
            WHERE id = ? AND end_time IS NULL
        `);
        
        this.getActiveSessionStmt = await this.prepareStatement(`
            SELECT s.*,
                   u.name as user_name,
                   d.name as device_name,
                   d.type as device_type,
                   g.name as game_name
            FROM sessions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN devices d ON s.device_id = d.id
            LEFT JOIN games g ON s.game_id = g.id
            WHERE s.end_time IS NULL AND s.device_id = ?
        `);
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
            const session = await this.getActiveSessionStmt.get(deviceId);
            if (session) {
                const controllers = await this.getControllersStmt.all(session.id);
                return {
                    success: true,
                    data: { ...session, attachedControllers: controllers }
                };
            }
            return { success: true, data: session };
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

    async updateSessionControllers(sessionId: number, controllerIds: number[]): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            return this.transaction(async () => {
                await this.deleteControllerStmt.run(sessionId);
                for (const controllerId of controllerIds) {
                    await this.createControllerStmt.run(sessionId, controllerId);
                }
                return { success: true };
            });
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

import { BaseModel } from './BaseModel';
import { Station, DeviceType, DeviceStatus, QueryResult } from '../../types';

export class DeviceModel extends BaseModel {
    private static instance: DeviceModel;

    private constructor() {
        super('stations');
    }

    public static getInstance(): DeviceModel {
        if (!DeviceModel.instance) {
            DeviceModel.instance = new DeviceModel();
        }
        return DeviceModel.instance;
    }

    async create(device: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<QueryResult<number>> {
        return this.handleQuery(async () => {
            const columns = Object.keys(device).join(', ');
            const values = Object.values(device);
            const placeholders = values.map(() => '?').join(', ');
            
            return this.withStatement(
                `INSERT INTO stations (${columns}) VALUES (${placeholders})`,
                async (stmt): Promise<QueryResult<number>> => {
                    try {
                        stmt.bind(values);
                        stmt.step();
                        const db = await this.getDb();
                        const lastIdResult = db.exec('SELECT last_insert_rowid()');
                        
                        if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
                            const lastInsertId = Number(lastIdResult[0].values[0][0]);
                            return { 
                                success: true, 
                                data: lastInsertId,
                                changes: 1,
                                lastInsertId 
                            };
                        }
                        return { 
                            success: false, 
                            error: 'Failed to get last insert ID',
                            changes: 0 
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Insert failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async update(id: number, device: Partial<Station>): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            const result = await this.findById(id);
            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: 'Device not found',
                    changes: 0
                };
            }

            const setClause = Object.keys(device)
                .map(key => `${key} = ?`)
                .join(', ');
            const values = Object.values(device);
            
            return this.withStatement(
                `UPDATE stations SET ${setClause} WHERE id = ?`,
                async (stmt): Promise<QueryResult<void>> => {
                    try {
                        stmt.bind([...values, id]);
                        stmt.step();
                        return { success: true, changes: 1 };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Update failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async updateStatus(id: number, status: DeviceStatus): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `UPDATE stations SET status = ? WHERE id = ?`,
                async (stmt): Promise<QueryResult<void>> => {
                    try {
                        stmt.bind([status, id]);
                        stmt.step();
                        return { success: true, changes: 1 };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Status update failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async findById(id: number): Promise<QueryResult<Station>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM stations WHERE id = ?`,
                async (stmt): Promise<QueryResult<Station>> => {
                    try {
                        stmt.bind([id]);
                        if (stmt.step()) {
                            const result = stmt.getAsObject();
                            return {
                                success: true,
                                data: {
                                    id: result.id,
                                    name: result.name,
                                    type: result.type as DeviceType,
                                    status: result.status as DeviceStatus,
                                    location: result.location,
                                    price_per_minute: Number(result.price_per_minute),
                                    created_at: result.created_at,
                                    updated_at: result.updated_at
                                },
                                changes: 0
                            };
                        }
                        return { 
                            success: false, 
                            error: 'Device not found',
                            changes: 0 
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Lookup failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async findByType(type: DeviceType): Promise<QueryResult<Station[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM stations WHERE type = ?`,
                async (stmt): Promise<QueryResult<Station[]>> => {
                    try {
                        stmt.bind([type]);
                        const results: Station[] = [];
                        while (stmt.step()) {
                            const row = stmt.getAsObject();
                            results.push({
                                id: row.id,
                                name: row.name,
                                type: row.type as DeviceType,
                                status: row.status as DeviceStatus,
                                location: row.location,
                                price_per_minute: Number(row.price_per_minute),
                                created_at: row.created_at,
                                updated_at: row.updated_at
                            });
                        }
                        return { success: true, data: results, changes: 0 };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Query failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async findAvailable(): Promise<QueryResult<Station[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM stations WHERE status = 'available' ORDER BY type, name`,
                async (stmt): Promise<QueryResult<Station[]>> => {
                    try {
                        const results: Station[] = [];
                        while (stmt.step()) {
                            const row = stmt.getAsObject();
                            results.push({
                                id: row.id,
                                name: row.name,
                                type: row.type as DeviceType,
                                status: row.status as DeviceStatus,
                                location: row.location,
                                price_per_minute: Number(row.price_per_minute),
                                created_at: row.created_at,
                                updated_at: row.updated_at
                            });
                        }
                        return { success: true, data: results, changes: 0 };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Query failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async findAvailableByType(type: DeviceType): Promise<QueryResult<Station[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM stations WHERE type = ? AND status = 'available' ORDER BY name`,
                async (stmt): Promise<QueryResult<Station[]>> => {
                    try {
                        stmt.bind([type]);
                        const results: Station[] = [];
                        while (stmt.step()) {
                            const row = stmt.getAsObject();
                            results.push({
                                id: row.id,
                                name: row.name,
                                type: row.type as DeviceType,
                                status: row.status as DeviceStatus,
                                location: row.location,
                                price_per_minute: Number(row.price_per_minute),
                                created_at: row.created_at,
                                updated_at: row.updated_at
                            });
                        }
                        return { success: true, data: results, changes: 0 };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Query failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async getDeviceWithCurrentSession(id: number): Promise<QueryResult<Station & { current_session?: any }>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT d.*, 
                       s.id as session_id,
                       s.start_time,
                       s.user,
                       u.name as user_name
                FROM stations d
                LEFT JOIN sessions s ON d.id = s.station_id AND s.end_time IS NULL
                LEFT JOIN users u ON s.user = u.id
                WHERE d.id = ?`,
                async (stmt): Promise<QueryResult<Station & { current_session?: any }>> => {
                    try {
                        stmt.bind([id]);
                        if (stmt.step()) {
                            const result = stmt.getAsObject();
                            return { 
                                success: true, 
                                data: {
                                    ...result,
                                    id: result.id,
                                    type: result.type as DeviceType,
                                    status: result.status as DeviceStatus,
                                    price_per_minute: Number(result.price_per_minute)
                                },
                                changes: 0
                            };
                        }
                        return { 
                            success: false, 
                            error: 'Device not found',
                            changes: 0 
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Query failed',
                            changes: 0
                        };
                    }
                }
            );
        });
    }

    async getDevicesStatus(): Promise<QueryResult<{ 
        total: number;
        available: number;
        occupied: number;
        maintenance: number;
        by_type: { type: DeviceType; count: number }[];
    }>> {
        return this.handleQuery(async () => {
            const counts = await this.withStatement(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
                FROM stations`,
                async (stmt): Promise<QueryResult<{
                    total: number;
                    available: number;
                    occupied: number;
                    maintenance: number;
                }>> => {
                    try {
                        if (stmt.step()) {
                            const result = stmt.getAsObject();
                            return {
                                success: true,
                                data: {
                                    total: Number(result.total),
                                    available: Number(result.available),
                                    occupied: Number(result.occupied),
                                    maintenance: Number(result.maintenance)
                                },
                                changes: 0
                            };
                        }
                        return { success: false, error: 'No status data found', changes: 0 };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Status query failed',
                            changes: 0
                        };
                    }
                }
            );

            const byType = await this.withStatement(
                `SELECT type, COUNT(*) as count
                FROM stations
                GROUP BY type
                ORDER BY type`,
                async (stmt): Promise<QueryResult<Array<{type: DeviceType; count: number}>>> => {
                    try {
                        const results = [];
                        while (stmt.step()) {
                            const row = stmt.getAsObject();
                            results.push({
                                type: row.type as DeviceType,
                                count: Number(row.count)
                            });
                        }
                        return { success: true, data: results, changes: 0 };
                    } catch (error) {
                        return {
                            success: false,
                            error: error instanceof Error ? error.message : 'Type count query failed',
                            changes: 0
                        };
                    }
                }
            );

            if (!counts.success || !byType.success) {
                return {
                    success: false,
                    error: counts.error || byType.error || 'Failed to get device status',
                    changes: 0
                };
            }

            return {
                success: true,
                data: {
                    total: counts.data?.total || 0,
                    available: counts.data?.available || 0,
                    occupied: counts.data?.occupied || 0,
                    maintenance: counts.data?.maintenance || 0,
                    by_type: byType.data || []
                },
                changes: 0
            };
        });
    }
}

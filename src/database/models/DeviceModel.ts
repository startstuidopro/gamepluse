import { BaseModel } from './BaseModel';
import { Device, DeviceType, DeviceStatus, QueryResult } from '../../types';

export class DeviceModel extends BaseModel {
    private static instance: DeviceModel;

    private constructor() {
        super('devices');
    }

    public static getInstance(): DeviceModel {
        if (!DeviceModel.instance) {
            DeviceModel.instance = new DeviceModel();
        }
        return DeviceModel.instance;
    }

    async create(device: Omit<Device, 'id' | 'created_at' | 'updated_at'>): Promise<QueryResult<number>> {
        return this.handleQuery(async () => {
            const columns = Object.keys(device).join(', ');
            const values = Object.values(device);
            const placeholders = values.map(() => '?').join(', ');
            
            return this.withStatement<number>(
                `INSERT INTO devices (${columns}) VALUES (${placeholders})`,
                async (stmt): Promise<QueryResult<number>> => {
                    // Explicitly type the return value
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

    async update(id: number, device: Partial<Device>): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            const result = await this.findById(id);
            if (!result.success || !result.data) {
                throw new Error('Device not found');
            }
            // const current = result.data;

            const setClause = Object.keys(device)
                .map(key => `${key} = ?`)
                .join(', ');
            const values = Object.values(device);
            
            return this.withStatement(
                `UPDATE devices SET ${setClause} WHERE id = ?`,
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
                `UPDATE devices SET status = ? WHERE id = ?`,
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

    async findById(id: number): Promise<QueryResult<Device>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM devices WHERE id = ?`,
                async (stmt): Promise<QueryResult<Device>> => {
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

    async findByType(type: DeviceType): Promise<QueryResult<Device[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM devices WHERE type = ?`,
                async (stmt): Promise<QueryResult<Device[]>> => {
                    try {
                        stmt.bind([type]);
                        const results: Device[] = [];
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

    async findAvailable(): Promise<QueryResult<Device[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM devices WHERE status = 'available' ORDER BY type, name`,
                async (stmt): Promise<QueryResult<Device[]>> => {
                    try {
                        const results: Device[] = [];
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

    async findAvailableByType(type: DeviceType): Promise<QueryResult<Device[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM devices WHERE type = ? AND status = 'available' ORDER BY name`,
                async (stmt): Promise<QueryResult<Device[]>> => {
                    try {
                        stmt.bind([type]);
                        const results: Device[] = [];
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

    async getDeviceWithCurrentSession(id: number): Promise<QueryResult<Device & { current_session?: any }>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT d.*, 
                       s.id as session_id,
                       s.start_time,
                       s.user_id,
                       u.name as user_name
                FROM devices d
                LEFT JOIN sessions s ON d.id = s.device_id AND s.end_time IS NULL
                LEFT JOIN users u ON s.user_id = u.id
                WHERE d.id = ?`,
                async (stmt): Promise<QueryResult<Device & { current_session?: any }>> => {
                    try {
                        stmt.bind([id]);
                        if (stmt.step()) {
                            const result = stmt.getAsObject() as Device & { 
                                current_session?: any 
                            };
                            return { 
                                success: true, 
                                data: result,
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
                FROM devices`,
                async (stmt): Promise<QueryResult<{
                    total: string;
                    available: string;
                    occupied: string;
                    maintenance: string;
                }>> => {
                    try {
                        if (stmt.step()) {
                            const result = stmt.getAsObject();
                            return {
                                success: true,
                                data: {
                                    total: result.total,
                                    available: result.available,
                                    occupied: result.occupied,
                                    maintenance: result.maintenance
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
                FROM devices
                GROUP BY type
                ORDER BY type`,
                async (stmt): Promise<QueryResult<Array<{type: string; count: string}>>> => {
                    try {
                        const results = [];
                        while (stmt.step()) {
                            results.push(stmt.getAsObject());
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

            if (!counts.data || !byType.data) {
                return {
                    success: false,
                    error: 'Missing status data after successful query',
                    changes: 0
                };
            }

            return {
                success: true,
                data: {
                    total: Number(counts.data.total),
                    available: Number(counts.data.available),
                    occupied: Number(counts.data.occupied),
                    maintenance: Number(counts.data.maintenance),
                    by_type: byType.data.map(row => ({
                        type: row.type as DeviceType,
                        count: Number(row.count)
                    }))
                },
                changes: 0
            };
        });
    }
}

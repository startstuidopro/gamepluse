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
        try {
            const columns = Object.keys(device).join(', ');
            const values = Object.values(device);
            const placeholders = values.map(() => '?').join(', ');
            
            const lastInsertId = await this.withStatement(
                `INSERT INTO devices (${columns}) VALUES (${placeholders})`,
                async (stmt) => {
                    stmt.bind(values);
                    stmt.step();
                    const db = await this.getDb();
                    const lastIdResult = db.exec('SELECT last_insert_rowid()');
                    if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
                        return Number(lastIdResult[0].values[0][0]);
                    }
                    throw new Error('Failed to get last insert ID');
                }
            );
            
            return {
                success: true,
                data: lastInsertId,
                changes: 1,
                lastInsertId: lastInsertId,
                error: undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                changes: 0,
                lastInsertId: undefined
            };
        }
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
                async (stmt) => {
                    stmt.bind([...values, id]);
                    stmt.step();
                    return;
                }
            );
        });
    }

    async updateStatus(id: number, status: DeviceStatus): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `UPDATE devices SET status = ? WHERE id = ?`,
                async (stmt) => {
                    stmt.bind([status, id]);
                    stmt.step();
                    return;
                }
            );
        });
    }

    async findById(id: number): Promise<QueryResult<Device | null>> {
        try {
            const device = await this.withStatement(
                `SELECT * FROM devices WHERE id = ?`,
                async (stmt) => {
                    stmt.bind([id]);
                    if (stmt.step()) {
                        const result = stmt.getAsObject();
                        return {
                            id: result.id,
                            name: result.name,
                            type: result.type,
                            status: result.status,
                            location: result.location,
                            price_per_minute: result.price_per_minute,
                            created_at: result.created_at,
                            updated_at: result.updated_at
                        } as Device;
                    }
                    return null;
                }
            );
            
            return {
                success: !!device,
                data: device,
                changes: 0,
                lastInsertId: undefined,
                error: device ? undefined : 'Device not found'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                changes: 0,
                lastInsertId: undefined
            };
        }
    }

    async findByType(type: DeviceType): Promise<QueryResult<Device[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM devices WHERE type = ?`,
                async (stmt) => {
                    stmt.bind([type]);
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    return results;
                }
            );
        });
    }

    async findAvailable(): Promise<QueryResult<Device[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM devices WHERE status = 'available' ORDER BY type, name`,
                async (stmt) => {
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    return results;
                }
            );
        });
    }

    async findAvailableByType(type: DeviceType): Promise<QueryResult<Device[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(
                `SELECT * FROM devices WHERE type = ? AND status = 'available' ORDER BY name`,
                async (stmt) => {
                    stmt.bind([type]);
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    return results;
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
                async (stmt) => {
                    stmt.bind([id]);
                    return stmt.step() ? stmt.getAsObject() : null;
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
                async (stmt) => {
                    return stmt.step() ? stmt.getAsObject() : null;
                }
            );

            const byType = await this.withStatement(
                `SELECT type, COUNT(*) as count
                FROM devices
                GROUP BY type
                ORDER BY type`,
                async (stmt) => {
                    const results = [];
                    while (stmt.step()) {
                        results.push(stmt.getAsObject());
                    }
                    return results;
                }
            );

            return {
                total: counts?.total || 0,
                available: counts?.available || 0,
                occupied: counts?.occupied || 0,
                maintenance: counts?.maintenance || 0,
                by_type: byType || []
            };
        });
    }
}

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

    // Prepared statements
    private createStmt = this.prepareStatement(`
        INSERT INTO devices (name, type, status, location, price_per_minute)
        VALUES (?, ?, ?, ?, ?)
    `);

    private updateStmt = this.prepareStatement(`
        UPDATE devices 
        SET name = ?, type = ?, status = ?, location = ?, price_per_minute = ?
        WHERE id = ?
    `);

    private updateStatusStmt = this.prepareStatement(`
        UPDATE devices SET status = ? WHERE id = ?
    `);

    private findByIdStmt = this.prepareStatement(`
        SELECT * FROM devices WHERE id = ?
    `);

    private findByTypeStmt = this.prepareStatement(`
        SELECT * FROM devices WHERE type = ?
    `);

    create(device: Omit<Device, 'id' | 'created_at' | 'updated_at'>): QueryResult<number> {
        return this.handleQuery(() => {
            const result = this.createStmt.run(
                device.name,
                device.type,
                device.status,
                device.location,
                device.price_per_minute
            );
            return result.lastInsertRowid;
        });
    }

    update(id: number, device: Partial<Device>): QueryResult<void> {
        return this.handleQuery(() => {
            const current = this.findByIdStmt.get(id);
            if (!current) throw new Error('Device not found');

            this.updateStmt.run(
                device.name ?? current.name,
                device.type ?? current.type,
                device.status ?? current.status,
                device.location ?? current.location,
                device.price_per_minute ?? current.price_per_minute,
                id
            );
        });
    }

    updateStatus(id: number, status: DeviceStatus): QueryResult<void> {
        return this.handleQuery(() => {
            this.updateStatusStmt.run(status, id);
        });
    }

    findById(id: number): QueryResult<Device> {
        return this.handleQuery(() => {
            return this.findByIdStmt.get(id);
        });
    }

    findByType(type: DeviceType): QueryResult<Device[]> {
        return this.handleQuery(() => {
            return this.findByTypeStmt.all(type);
        });
    }

    findAvailable(): QueryResult<Device[]> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                SELECT * FROM devices 
                WHERE status = 'available'
                ORDER BY type, name
            `).all();
        });
    }

    findAvailableByType(type: DeviceType): QueryResult<Device[]> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                SELECT * FROM devices 
                WHERE type = ? AND status = 'available'
                ORDER BY name
            `).all(type);
        });
    }

    getDeviceWithCurrentSession(id: number): QueryResult<Device & { current_session?: any }> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                SELECT d.*, 
                       s.id as session_id,
                       s.start_time,
                       s.user_id,
                       u.name as user_name
                FROM devices d
                LEFT JOIN sessions s ON d.id = s.device_id AND s.end_time IS NULL
                LEFT JOIN users u ON s.user_id = u.id
                WHERE d.id = ?
            `).get(id);
        });
    }

    getDevicesStatus(): QueryResult<{ 
        total: number;
        available: number;
        occupied: number;
        maintenance: number;
        by_type: { type: DeviceType; count: number }[];
    }> {
        return this.handleQuery(() => {
            const counts = this.prepareStatement(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
                FROM devices
            `).get();

            const byType = this.prepareStatement(`
                SELECT type, COUNT(*) as count
                FROM devices
                GROUP BY type
                ORDER BY type
            `).all();

            return {
                ...counts,
                by_type: byType
            };
        });
    }
}

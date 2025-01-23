import { BaseModel } from './BaseModel';
import { Controller, ControllerStatus, QueryResult } from '../../types';

export class ControllerModel extends BaseModel {
    private static instance: ControllerModel;

    private constructor() {
        super('controllers');
    }

    public static getInstance(): ControllerModel {
        if (!ControllerModel.instance) {
            ControllerModel.instance = new ControllerModel();
        }
        return ControllerModel.instance;
    }

    // Prepared statements
    private createStmt = this.prepareStatement(`
        INSERT INTO controllers (device_id, identifier, status, last_maintenance)
        VALUES (?, ?, ?, ?)
    `);

    private updateStmt = this.prepareStatement(`
        UPDATE controllers 
        SET device_id = ?, identifier = ?, status = ?, last_maintenance = ?
        WHERE id = ?
    `);

    private updateStatusStmt = this.prepareStatement(`
        UPDATE controllers SET status = ? WHERE id = ?
    `);

    private findByIdStmt = this.prepareStatement(`
        SELECT c.*, d.name as device_name, d.type as device_type
        FROM controllers c
        LEFT JOIN devices d ON c.device_id = d.id
        WHERE c.id = ?
    `);

    private findByDeviceStmt = this.prepareStatement(`
        SELECT * FROM controllers WHERE device_id = ?
    `);

    create(controller: Omit<Controller, 'id' | 'created_at' | 'updated_at'>): QueryResult<number> {
        return this.handleQuery(() => {
            // Validate device exists
            const deviceExists = this.prepareStatement(
                'SELECT 1 FROM devices WHERE id = ?'
            ).get(controller.device_id);

            if (!deviceExists) {
                throw new Error('Device not found');
            }

            const result = this.createStmt.run(
                controller.device_id,
                controller.identifier,
                controller.status,
                controller.last_maintenance ?? new Date().toISOString()
            );
            return result.lastInsertRowid;
        });
    }

    update(id: number, controller: Partial<Controller>): QueryResult<void> {
        return this.handleQuery(() => {
            const current = this.findByIdStmt.get(id) as Controller;
            if (!current) throw new Error('Controller not found');

            // Validate device if changing
            if (controller.device_id && controller.device_id !== current.device_id) {
                const deviceExists = this.prepareStatement(
                    'SELECT 1 FROM devices WHERE id = ?'
                ).get(controller.device_id);

                if (!deviceExists) {
                    throw new Error('Device not found');
                }
            }

            this.updateStmt.run(
                controller.device_id ?? current.device_id,
                controller.identifier ?? current.identifier,
                controller.status ?? current.status,
                controller.last_maintenance ?? current.last_maintenance,
                id
            );
        });
    }

    updateStatus(id: number, status: ControllerStatus): QueryResult<void> {
        return this.handleQuery(() => {
            const current = this.findByIdStmt.get(id) as Controller;
            if (!current) throw new Error('Controller not found');

            this.updateStatusStmt.run(status, id);

            // If marking as maintenance, update last_maintenance
            if (status === 'maintenance') {
                this.prepareStatement(
                    'UPDATE controllers SET last_maintenance = ? WHERE id = ?'
                ).run(new Date().toISOString(), id);
            }
        });
    }

    findById(id: number): QueryResult<Controller> {
        return this.handleQuery(() => {
            const result = this.findByIdStmt.get(id) as Controller;
            if (!result) return null;
            return result;
        });
    }

    findByDevice(deviceId: number): QueryResult<Controller[]> {
        return this.handleQuery(() => {
            return this.findByDeviceStmt.all(deviceId);
        });
    }

    findAvailable(): QueryResult<Controller[]> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                SELECT c.*, d.name as device_name, d.type as device_type
                FROM controllers c
                LEFT JOIN devices d ON c.device_id = d.id
                WHERE c.status = 'available'
                ORDER BY c.device_id, c.identifier
            `).all() as Controller[];
        });
    }

    findNeedingMaintenance(daysThreshold: number = 30): QueryResult<Controller[]> {
        return this.handleQuery(() => {
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - daysThreshold);

            return this.prepareStatement(`
                SELECT c.*, d.name as device_name, d.type as device_type
                FROM controllers c
                LEFT JOIN devices d ON c.device_id = d.id
                WHERE c.last_maintenance < ?
                   OR c.status = 'maintenance'
                ORDER BY c.last_maintenance ASC
            `).all(threshold.toISOString()) as Controller[];
        });
    }

    assignToSession(
        controllerId: number, 
        sessionId: number
    ): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                const controller = this.findByIdStmt.get(controllerId) as Controller;
                if (!controller) throw new Error('Controller not found');
                if (controller.status !== 'available') {
                    throw new Error('Controller is not available');
                }

                // Validate session exists and is active
                const sessionExists = this.prepareStatement(`
                    SELECT 1 FROM sessions 
                    WHERE id = ? AND end_time IS NULL
                `).get(sessionId);

                if (!sessionExists) {
                    throw new Error('Active session not found');
                }

                // Create assignment
                this.prepareStatement(`
                    INSERT INTO session_controllers (session_id, controller_id)
                    VALUES (?, ?)
                `).run(sessionId, controllerId);

                // Update controller status
                this.updateStatusStmt.run('in_use', controllerId);
            });
        });
    }

    unassignFromSession(
        controllerId: number, 
        sessionId: number
    ): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                // Remove assignment
                this.prepareStatement(`
                    DELETE FROM session_controllers 
                    WHERE session_id = ? AND controller_id = ?
                `).run(sessionId, controllerId);

                // Update controller status
                this.updateStatusStmt.run('available', controllerId);
            });
        });
    }

    getControllerStats(): QueryResult<{
        total: number;
        available: number;
        in_use: number;
        maintenance: number;
        by_device: { 
            device_id: number; 
            device_name: string; 
            total: number;
            available: number 
        }[];
        maintenance_needed: number;
    }> {
        return this.handleQuery(() => {
            const counts = this.prepareStatement(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
                FROM controllers
            `).get() as {
                total: number;
                available: number;
                in_use: number;
                maintenance: number;
            };

            const byDevice = this.prepareStatement(`
                SELECT 
                    d.id as device_id,
                    d.name as device_name,
                    COUNT(*) as total,
                    SUM(CASE WHEN c.status = 'available' THEN 1 ELSE 0 END) as available
                FROM controllers c
                JOIN devices d ON c.device_id = d.id
                GROUP BY d.id
                ORDER BY d.name
            `).all() as {
                device_id: number;
                device_name: string;
                total: number;
                available: number;
            }[];

            const threshold = new Date();
            threshold.setDate(threshold.getDate() - 30);
            
            const maintenanceNeeded = this.prepareStatement(`
                SELECT COUNT(*) as count
                FROM controllers
                WHERE last_maintenance < ?
                   OR status = 'maintenance'
            `).get(threshold.toISOString()) as { count: number };

            return {
                ...counts,
                by_device: byDevice,
                maintenance_needed: maintenanceNeeded.count
            };
        });
    }

    delete(id: number): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                const controller = this.findByIdStmt.get(id) as Controller;
                if (!controller) throw new Error('Controller not found');
                if (controller.status === 'in_use') {
                    throw new Error('Cannot delete controller in use');
                }

                // Remove any session assignments
                this.prepareStatement(
                    'DELETE FROM session_controllers WHERE controller_id = ?'
                ).run(id);

                // Delete controller
                this.prepareStatement(
                    'DELETE FROM controllers WHERE id = ?'
                ).run(id);
            });
        });
    }
}

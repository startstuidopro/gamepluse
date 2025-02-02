import { BaseModel } from './BaseModel';
import { Controller, ControllerStatus, QueryResult } from '../../types';
import { Database } from 'sql.js';

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
    private async createStmt() {
        const db = await this.getDb();

        return db.prepare(`
            INSERT INTO controllers (name, type, status, price_per_minute, color, identifier, last_maintenance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
    }

    private async updateStmt() {
        const db = await this.getDb();

        return db.prepare(`
            UPDATE controllers 
            SET name = ?, type = ?, status = ?, price_per_minute = ?, color = ?, identifier = ?, last_maintenance = ?
            WHERE id = ?
        `);
    }

    private async updateStatusStmt() {
        const db = await this.getDb();

        return db.prepare(`
            UPDATE controllers SET status = ? WHERE id = ?
        `);
    }

    private async findByIdStmt() {
        const db = await this.getDb();

        return db.prepare(`
            SELECT c.*
            FROM controllers c
            WHERE c.id = ?
        `);
    }

    async create(controller: Omit<Controller, 'id' | 'created_at' | 'updated_at'>): Promise<QueryResult<{ id: number }>> {
        return this.handleQuery(async () => {
            const stmt = await this.createStmt();
            try {
                await stmt.run([
                    controller.name,
                    controller.type,
                    controller.status,
                    controller.price_per_minute,
                    controller.color,
                    controller.identifier,
                    controller.last_maintenance ?? new Date().toISOString()
                ]);

                const db = await this.getDb();
                const contollerId = (db as Database).exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;

                return { 
                    success: true,
                    data: { id: Number(contollerId) },
                    changes: 1,
                    lastInsertId: Number(contollerId)
                };
            } finally {
                await stmt.free();
            }
        });
    }

    async update(id: number, controller: Partial<Controller>): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            const findStmt = await this.findByIdStmt();
            const current = await findStmt.getAsObject([id]);
            await findStmt.free();

            if (!current) {
                throw new Error('Controller not found');
            }

            const updateStmt = await this.updateStmt();
            try {
                await updateStmt.run([
                    controller.name ?? current.name,
                    controller.type ?? current.type,
                    controller.status ?? current.status,
                    controller.price_per_minute ?? current.price_per_minute,
                    controller.color ?? current.color,
                    controller.identifier ?? current.identifier,
                    controller.last_maintenance ?? current.last_maintenance
                ]);
                return { success: true, changes: 1 };
            } finally {
                await updateStmt.free();
            }
        });
    }

    async updateStatus(id: number, status: ControllerStatus): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            const findStmt = await this.findByIdStmt();
            const current = await findStmt.get(id);
            await this.freeStatement(findStmt);

            if (!current) {
                throw new Error('Controller not found');
            }

            const updateStmt = await this.updateStatusStmt();
            try {
                await updateStmt.run(status, id);

                // If marking as maintenance, update last_maintenance
                if (status === 'maintenance') {
                    const maintenanceStmt = await this.prepareStatement(
                        'UPDATE controllers SET last_maintenance = ? WHERE id = ?'
                    );
                    await maintenanceStmt.run(new Date().toISOString(), id);
                    await this.freeStatement(maintenanceStmt);
                }

                return { success: true, changes: 1 };
            } finally {
                await this.freeStatement(updateStmt);
            }
        });
    }

    async findById(id: number): Promise<QueryResult<Controller>> {
        return this.handleQuery(async () => {
            const stmt = await this.findByIdStmt();
            try {
                const result = await stmt.getAsObject([id]);  
                if (!result) {
                    throw new Error('Controller not found');
                }
                return { 
                    success: true, 
                    data: result as Controller,
                    changes: 0 
                };
            } finally {
                await stmt.free();
            }
        });
    }

    async findAvailable(): Promise<QueryResult<Controller[]>> {
        return this.handleQuery(async () => {
            return this.withStatement(`
                SELECT c.*
                FROM controllers c
                WHERE c.status = 'available'
                ORDER BY c.identifier
            `, async (stmt) => {
                const results = [];
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                return { 
                    success: true, 
                    data: results as Controller[],
                    changes: 0 
                };
            });
        });
    }

    async findNeedingMaintenance(daysThreshold: number = 30): Promise<QueryResult<Controller[]>> {
        return this.handleQuery(async () => {
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - daysThreshold);

            const stmt = await this.prepareStatement(`
                SELECT c.*, d.name as device_name, d.type as device_type
                FROM controllers
                WHERE last_maintenance < ?
                   OR c.status = 'maintenance'
                ORDER BY c.last_maintenance ASC
            `);
            try {
                const results = await stmt.all(threshold.toISOString());
                return { 
                    success: true, 
                    data: results as Controller[],
                    changes: 0 
                };
            } finally {
                await this.freeStatement(stmt);
            }
        });
    }

    async assignToSession(
        controllerId: number, 
        sessionId: number
    ): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            return this.transaction(async () => {
                const findStmt = await this.findByIdStmt();
                const controller = await findStmt.get(controllerId);
                await this.freeStatement(findStmt);

                if (!controller) {
                    throw new Error('Controller not found');
                }
                if (controller.status !== 'available') {
                    throw new Error('Controller is not available');
                }

                // Validate session exists and is active
                const sessionStmt = await this.prepareStatement(`
                    SELECT 1 FROM sessions 
                    WHERE id = ? AND end_time IS NULL
                `);
                const sessionExists = await sessionStmt.get(sessionId);
                await this.freeStatement(sessionStmt);

                if (!sessionExists) {
                    throw new Error('Active session not found');
                }

                // Create assignment
                const assignStmt = await this.prepareStatement(`
                    INSERT INTO session_controllers (session_id, controller_id)
                    VALUES (?, ?)
                `);
                await assignStmt.run(sessionId, controllerId);
                await this.freeStatement(assignStmt);

                // Update controller status
                const updateStmt = await this.updateStatusStmt();
                await updateStmt.run('in_use', controllerId);
                await this.freeStatement(updateStmt);

                return { success: true, changes: 1 };
            });
        });
    }

    async unassignFromSession(
        controllerId: number, 
        sessionId: number
    ): Promise<QueryResult<void>> {
        return this.handleQuery(async () => {
            return this.transaction(async () => {
                // Remove assignment
                const deleteStmt = await this.prepareStatement(`
                    DELETE FROM session_controllers 
                    WHERE session_id = ? AND controller_id = ?
                `);
                await deleteStmt.run(sessionId, controllerId);
                await this.freeStatement(deleteStmt);

                // Update controller status
                const updateStmt = await this.updateStatusStmt();
                await updateStmt.run('available', controllerId);
                await this.freeStatement(updateStmt);

                return { success: true, changes: 1 };
            });
        });
    }

    async getControllerStats(): Promise<QueryResult<{
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
    }>> {
        return this.handleQuery(async () => {
            const countsStmt = await this.prepareStatement(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
                FROM controllers
            `); 
            const counts = await countsStmt.get();
            await this.freeStatement(countsStmt);

            const byDeviceStmt = await this.prepareStatement(`
                SELECT 
                    d.id as device_id,
                    d.name as device_name,
                    COUNT(*) as total
                FROM controllers c
                GROUP BY d.id
                ORDER BY c.identifier
            `);
            const byDevice = await byDeviceStmt.all();
            await this.freeStatement(byDeviceStmt);

            const threshold = new Date();
            threshold.setDate(threshold.getDate() - 30);
            
            const maintenanceStmt = await this.prepareStatement(`
                SELECT COUNT(*) as count
                FROM controllers
                WHERE last_maintenance < ?
                   OR status = 'maintenance'
            `);
            const maintenanceNeeded = await maintenanceStmt.get(threshold.toISOString());
            await this.freeStatement(maintenanceStmt);

            return {
                ...counts,
                by_device: byDevice,
                maintenance_needed: maintenanceNeeded.count
            };
        });
    }

    async delete(id: number): Promise<QueryResult<boolean>> {
        return this.handleQuery(async () => {
            return this.transaction(async () => {
                const db = await this.getDb();

                const findStmt = await this.findByIdStmt();
                const controller = await findStmt.getAsObject([id]);
                console.log('controller', controller);
                await findStmt.free();

                if (!controller) {
                    return { 
                        success: false,
                        changes: 0,
                        data: false 
                    };
                }
                if (controller.status === 'in-use') {
                    return { 
                        success: false,
                        changes: 0,
                        data: false 
                    };
                }

                // Remove any session assignments
                const deleteAssignmentsStmt = await db.prepare(
                    'DELETE FROM session_controllers WHERE controller_id = ?'
                );
                await deleteAssignmentsStmt.run([id]);
                await deleteAssignmentsStmt.free();

                // Delete controller
                const deleteStmt = await db.prepare(
                    'DELETE FROM controllers WHERE id = ?'
                );
                const result = await deleteStmt.run([id]);

                console.log('result', result);
                await deleteStmt.free();

                return { 
                    success: result,
                    changes: result,
                    data: result 
                };
            });
        });
    }
}

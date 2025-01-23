import { BaseModel } from './BaseModel';
import { User, QueryResult } from '../../types';

export class UserModel extends BaseModel {
    private static instance: UserModel;

    private constructor() {
        super('users');
    }

    public static getInstance(): UserModel {
        if (!UserModel.instance) {
            UserModel.instance = new UserModel();
        }
        return UserModel.instance;
    }

    // Prepared statements
    private createStmt = this.prepareStatement(
        `INSERT INTO users (name, phone, password_hash, role, membership_type, credit)
         VALUES (?, ?, ?, ?, ?, ?)`
    );

    private updateStmt = this.prepareStatement(
        `UPDATE users 
         SET name = ?, phone = ?, role = ?, membership_type = ?, credit = ?, last_active = ?
         WHERE id = ?`
    );

    private findByIdStmt = this.prepareStatement(
        'SELECT * FROM users WHERE id = ?'
    );

    private findByPhoneStmt = this.prepareStatement(
        'SELECT * FROM users WHERE phone = ?'
    );

    create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): QueryResult<number> {
        return this.handleQuery(() => {
            const result = this.createStmt.run(
                user.name,
                user.phone,
                user.password_hash,
                user.role,
                user.membership_type,
                user.credit
            );
            return result.lastInsertRowid;
        });
    }

    update(id: number, user: Partial<User>): QueryResult<void> {
        return this.handleQuery(() => {
            const current = this.findByIdStmt.get(id) as User;
            if (!current) throw new Error('User not found');

            // If updating phone, check for uniqueness
            if (user.phone && user.phone !== current.phone) {
                const existing = this.findByPhoneStmt.get(user.phone) as User;
                if (existing) throw new Error('Phone number already exists');
            }

            this.updateStmt.run(
                user.name ?? current.name,
                user.phone ?? current.phone,
                user.password_hash ?? current.password_hash,
                user.role ?? current.role,
                user.membership_type ?? current.membership_type,
                user.credit ?? current.credit,
                user.last_active ?? current.last_active,
                id
            );
        });
    }

    findById(id: number): QueryResult<User> {
        return this.handleQuery(() => {
            return this.findByIdStmt.get(id) as User;
        });
    }

    findByPhone(phone: string): QueryResult<User> {
        return this.handleQuery(() => {
            return this.findByPhoneStmt.get(phone) as User;
        });
    }

    updateLastActive(id: number): QueryResult<void> {
        return this.handleQuery(() => {
            const user = this.findByIdStmt.get(id) as User;
            if (!user) throw new Error('User not found');

            this.prepareStatement(
                'UPDATE users SET last_active = ? WHERE id = ?'
            ).run(new Date().toISOString(), id);
        });
    }

    getUserStats(): QueryResult<{
        total_users: number;
        active_users: number;
        by_role: { role: string; count: number }[];
        by_membership: { type: string; count: number }[];
    }> {
        return this.handleQuery(() => {
            const counts = this.prepareStatement(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE 
                        WHEN last_active > datetime('now', '-7 days') 
                        THEN 1 ELSE 0 
                    END) as active_users
                FROM users
            `).get() as {
                total_users: number;
                active_users: number;
            };

            const byRole = this.prepareStatement(`
                SELECT role, COUNT(*) as count
                FROM users
                GROUP BY role
                ORDER BY count DESC
            `).all() as { role: string; count: number }[];

            const byMembership = this.prepareStatement(`
                SELECT membership_type as type, COUNT(*) as count
                FROM users
                GROUP BY membership_type
                ORDER BY count DESC
            `).all() as { type: string; count: number }[];

            return {
                ...counts,
                by_role: byRole,
                by_membership: byMembership
            };
        });
    }

    updateCredit(id: number, amount: number): QueryResult<void> {
        return this.handleQuery(() => {
            const user = this.findByIdStmt.get(id) as User;
            if (!user) {
                throw new Error('User not found');
            }

            if (user.credit + amount < 0) {
                throw new Error('Insufficient credit');
            }

            this.prepareStatement('UPDATE users SET credit = ? WHERE id = ?')
                .run(user.credit + amount, id);
        });
    }

    transferCredit(fromId: number, toId: number, amount: number): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                this.updateCredit(fromId, -amount);
                this.updateCredit(toId, amount);
            });
        });
    }
}

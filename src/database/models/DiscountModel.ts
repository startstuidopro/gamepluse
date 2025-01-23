import { BaseModel } from './BaseModel';
import { 
    DiscountConfig, 
    MembershipType, 
    DiscountType,
    QueryResult 
} from '../../types';

export class DiscountModel extends BaseModel {
    private static instance: DiscountModel;

    private constructor() {
        super('discount_configs');
    }

    public static getInstance(): DiscountModel {
        if (!DiscountModel.instance) {
            DiscountModel.instance = new DiscountModel();
        }
        return DiscountModel.instance;
    }

    // Prepared statements
    private createStmt = this.prepareStatement(`
        INSERT INTO discount_configs (membership_type, discount_type, discount_rate)
        VALUES (?, ?, ?)
    `);

    private updateStmt = this.prepareStatement(`
        UPDATE discount_configs 
        SET discount_rate = ?
        WHERE membership_type = ? AND discount_type = ?
    `);

    private findByTypeStmt = this.prepareStatement(`
        SELECT * FROM discount_configs
        WHERE membership_type = ? AND discount_type = ?
    `);

    private findByMembershipStmt = this.prepareStatement(`
        SELECT * FROM discount_configs
        WHERE membership_type = ?
        ORDER BY discount_type
    `);

    create(config: Omit<DiscountConfig, 'id' | 'created_at' | 'updated_at'>): QueryResult<number> {
        return this.handleQuery(() => {
            // Check if configuration already exists
            const existing = this.findByTypeStmt.get(
                config.membership_type,
                config.discount_type
            );
            
            if (existing) {
                throw new Error('Discount configuration already exists');
            }

            // Validate discount rate
            if (config.discount_rate < 0 || config.discount_rate > 1) {
                throw new Error('Discount rate must be between 0 and 1');
            }

            const result = this.createStmt.run(
                config.membership_type,
                config.discount_type,
                config.discount_rate
            );
            return result.lastInsertRowid;
        });
    }

    update(
        membershipType: MembershipType,
        discountType: DiscountType,
        discountRate: number
    ): QueryResult<void> {
        return this.handleQuery(() => {
            // Validate discount rate
            if (discountRate < 0 || discountRate > 1) {
                throw new Error('Discount rate must be between 0 and 1');
            }

            const existing = this.findByTypeStmt.get(membershipType, discountType);
            if (!existing) {
                throw new Error('Discount configuration not found');
            }

            this.updateStmt.run(discountRate, membershipType, discountType);
        });
    }

    findByType(
        membershipType: MembershipType,
        discountType: DiscountType
    ): QueryResult<DiscountConfig> {
        return this.handleQuery(() => {
            return this.findByTypeStmt.get(membershipType, discountType) as DiscountConfig;
        });
    }

    findByMembership(membershipType: MembershipType): QueryResult<DiscountConfig[]> {
        return this.handleQuery(() => {
            return this.findByMembershipStmt.all(membershipType) as DiscountConfig[];
        });
    }

    getAllConfigs(): QueryResult<{
        [K in MembershipType]: {
            [T in DiscountType]?: number;
        };
    }> {
        return this.handleQuery(() => {
            const configs = this.prepareStatement(
                'SELECT * FROM discount_configs ORDER BY membership_type, discount_type'
            ).all() as DiscountConfig[];

            const result: {
                [K in MembershipType]: {
                    [T in DiscountType]?: number;
                };
            } = {
                standard: {},
                premium: {}
            };

            for (const config of configs) {
                result[config.membership_type][config.discount_type] = config.discount_rate;
            }

            return result;
        });
    }

    calculateDiscount(
        membershipType: MembershipType,
        discountType: DiscountType,
        amount: number
    ): QueryResult<{ 
        originalAmount: number;
        discountRate: number;
        discountAmount: number;
        finalAmount: number;
    }> {
        return this.handleQuery(() => {
            const config = this.findByTypeStmt.get(membershipType, discountType) as DiscountConfig | undefined;
            const discountRate = config ? config.discount_rate : 0;
            const discountAmount = amount * discountRate;

            return {
                originalAmount: amount,
                discountRate,
                discountAmount,
                finalAmount: amount - discountAmount
            };
        });
    }

    bulkUpdate(configs: {
        membershipType: MembershipType;
        discountType: DiscountType;
        discountRate: number;
    }[]): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                for (const config of configs) {
                    // Validate discount rate
                    if (config.discountRate < 0 || config.discountRate > 1) {
                        throw new Error(
                            `Invalid discount rate for ${config.membershipType} ${config.discountType}`
                        );
                    }

                    const existing = this.findByTypeStmt.get(
                        config.membershipType,
                        config.discountType
                    ) as DiscountConfig | undefined;

                    if (existing) {
                        this.updateStmt.run(
                            config.discountRate,
                            config.membershipType,
                            config.discountType
                        );
                    } else {
                        this.createStmt.run(
                            config.membershipType,
                            config.discountType,
                            config.discountRate
                        );
                    }
                }
            });
        });
    }

    getDiscountStats(): QueryResult<{
        average_rates: { [K in DiscountType]: number };
        membership_comparison: {
            type: MembershipType;
            average_discount: number;
            max_discount: number;
        }[];
    }> {
        return this.handleQuery(() => {
            const averageRates = this.prepareStatement(`
                SELECT 
                    discount_type,
                    AVG(discount_rate) as average_rate
                FROM discount_configs
                GROUP BY discount_type
            `).all() as { discount_type: DiscountType; average_rate: number }[];

            const membershipStats = this.prepareStatement(`
                SELECT 
                    membership_type as type,
                    AVG(discount_rate) as average_discount,
                    MAX(discount_rate) as max_discount
                FROM discount_configs
                GROUP BY membership_type
            `).all() as {
                type: MembershipType;
                average_discount: number;
                max_discount: number;
            }[];

            const avgRatesObj: { [K in DiscountType]: number } = {} as { [K in DiscountType]: number };
            for (const rate of averageRates) {
                avgRatesObj[rate.discount_type] = rate.average_rate;
            }

            return {
                average_rates: avgRatesObj,
                membership_comparison: membershipStats
            };
        });
    }

    delete(
        membershipType: MembershipType,
        discountType: DiscountType
    ): QueryResult<void> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                DELETE FROM discount_configs 
                WHERE membership_type = ? AND discount_type = ?
            `).run(membershipType, discountType);
        });
    }
}

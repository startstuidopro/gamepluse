import { BaseModel } from './BaseModel';
import { Game, DeviceType, QueryResult } from '../../types';

export class GameModel extends BaseModel {
    private static instance: GameModel;

    private constructor() {
        super('games');
    }

    public static getInstance(): GameModel {
        if (!GameModel.instance) {
            GameModel.instance = new GameModel();
        }
        return GameModel.instance;
    }

    // Prepared statements
    private createStmt = this.prepareStatement(`
        INSERT INTO games (
            name,
            price_per_minute,
            image,
            is_multiplayer,
            created_at,
            updated_at
        ) VALUES (
            :name,
            :price_per_minute,
            :image,
            :is_multiplayer,
            :created_at,
            :updated_at
        )
    `);
    
    private addCompatibilityStmt = this.prepareStatement(`
        INSERT INTO game_device_compatibility (game_id, device_type)
        VALUES (?, ?)
    `);
    
    private removeCompatibilityStmt = this.prepareStatement(`
        DELETE FROM game_device_compatibility
        WHERE game_id = ? AND device_type = ?
    `);
    
    private clearCompatibilityStmt = this.prepareStatement(`
        DELETE FROM game_device_compatibility WHERE game_id = ?
    `);
    
    private getCompatibilityStmt = this.prepareStatement(`
        SELECT device_type FROM game_device_compatibility WHERE game_id = ?
    `);
    
    private findByIdStmt = this.prepareStatement(`
        SELECT g.*,
               GROUP_CONCAT(gdc.device_type) as compatible_devices
        FROM games g
        LEFT JOIN game_device_compatibility gdc ON g.id = gdc.game_id
        WHERE g.id = ?
        GROUP BY g.id
    `);

    async create(data: Record<string, any>): Promise<QueryResult<any>> {
        try {
            const game = {
                name: data.name?.trim() || '',
                price_per_minute: Number(data.price_per_minute) || 0,
                image: data.image || '',
                is_multiplayer: Boolean(data.is_multiplayer),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Validation
            if (!game.name) {
                return {
                    success: false,
                    error: 'Game name cannot be empty'
                };
            }

            if (isNaN(game.price_per_minute) || game.price_per_minute < 0) {
                return {
                    success: false,
                    error: 'Price per minute must be a valid positive number'
                };
            }

            const compatibleDevices = data.device_types || [];

            const result = await this.handleQuery(async () => {
                return this.transaction(async () => {
                    const createStmt = await this.createStmt;
                    createStmt.reset();
                    createStmt.bind([
                        game.name,
                        game.price_per_minute,
                        game.image,
                        game.is_multiplayer,
                        game.created_at,
                        game.updated_at
                    ]);
                    const result = await createStmt.run();

                    const gameId = result.lastInsertRowid;

                    // Add device compatibility
                    const addStmt = await this.addCompatibilityStmt;
                    for (const deviceType of compatibleDevices) {
                        await addStmt.run(gameId, deviceType);
                    }

                    return gameId;
                });
            });

            return {
                success: true,
                data: result.data,
                lastInsertId: result.data
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async update(id: number, game: Partial<Game>, compatibleDevices?: DeviceType[]): Promise<QueryResult<void>> {
        try {
            await this.handleQuery(async () => {
                return this.transaction(async () => {
                    if (Object.keys(game).length > 0) {
                        const findStmt = await this.prepareStatement('SELECT * FROM games WHERE id = ?');
                        const current = await findStmt.get(id) as Game;
                        if (!current) throw new Error('Game not found');

                        const updateStmt = await this.prepareStatement(`
                            UPDATE games
                            SET name = ?, price_per_minute = ?, image = ?, is_multiplayer = ?
                            WHERE id = ?
                        `);
                        await updateStmt.run(
                            game.name ?? current.name,
                            game.price_per_minute ?? current.price_per_minute,
                            game.image ?? current.image,
                            game.is_multiplayer ?? current.is_multiplayer,
                            id
                        );
                    }

                    // Update device compatibility if provided
                    if (compatibleDevices) {
                        const clearStmt = await this.clearCompatibilityStmt;
                        await clearStmt.run(id);
                        
                        const addStmt = await this.addCompatibilityStmt;
                        for (const deviceType of compatibleDevices) {
                            await addStmt.run(id, deviceType);
                        }
                    }
                });
            });

            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async findById(id: number): Promise<QueryResult<Game & { compatible_devices: DeviceType[] }>> {
        try {
            const findStmt = await this.findByIdStmt;
            const game = await findStmt.get(id) as (Game & { compatible_devices: string | null }) | undefined;
            if (game) {
                return {
                    success: true,
                    data: {
                        ...game,
                        compatible_devices: game.compatible_devices ?
                            game.compatible_devices.split(',') as DeviceType[] : []
                    }
                };
            }
            return {
                success: false,
                error: 'Game not found'
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async findByDeviceType(deviceType: DeviceType): Promise<QueryResult<Game[]>> {
        try {
            const stmt = await this.prepareStatement(`
                SELECT DISTINCT g.*
                FROM games g
                JOIN game_device_compatibility gdc ON g.id = gdc.game_id
                WHERE gdc.device_type = ?
                ORDER BY g.name
            `);
            const games = await stmt.all(deviceType);
            return {
                success: true,
                data: games.map((game: Game & { compatible_devices?: string }) => ({
                    ...game as Game,
                    compatible_devices: game.compatible_devices?.split(',') || []
                }))
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async findMultiplayer(): Promise<QueryResult<Game[]>> {
        try {
            const stmt = await this.prepareStatement(`
                SELECT g.*, GROUP_CONCAT(gdc.device_type) as compatible_devices
                FROM games g
                LEFT JOIN game_device_compatibility gdc ON g.id = gdc.game_id
                WHERE g.is_multiplayer = 1
                GROUP BY g.id
                ORDER BY g.name
            `);
            const games = await stmt.all();
            return {
                success: true,
                data: games.map((game: Game & { compatible_devices?: string }) => ({
                    ...game as Game,
                    compatible_devices: game.compatible_devices?.split(',') || []
                }))
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getGameStats(): Promise<QueryResult<{
        total: number;
        multiplayer: number;
        by_device: { device_type: DeviceType; count: number }[];
        most_played: { id: number; name: string; session_count: number }[];
    }>> {
        try {
            const countsStmt = await this.prepareStatement(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN is_multiplayer THEN 1 ELSE 0 END) as multiplayer
                FROM games
            `);
            const counts = await countsStmt.get() as { total: number; multiplayer: number };

            const byDeviceStmt = await this.prepareStatement(`
                SELECT
                    device_type,
                    COUNT(*) as count
                FROM game_device_compatibility
                GROUP BY device_type
                ORDER BY count DESC
            `);
            const byDevice = await byDeviceStmt.all() as { device_type: DeviceType; count: number }[];

            const mostPlayedStmt = await this.prepareStatement(`
                SELECT
                    g.id,
                    g.name,
                    COUNT(s.id) as session_count
                FROM games g
                LEFT JOIN sessions s ON g.id = s.game_id
                GROUP BY g.id
                ORDER BY session_count DESC
                LIMIT 5
            `);
            const mostPlayed = await mostPlayedStmt.all() as { id: number; name: string; session_count: number }[];

            return {
                success: true,
                data: counts ? {
                    ...counts,
                    by_device: byDevice,
                    most_played: mostPlayed
                } : {
                    total: 0,
                    multiplayer: 0,
                    by_device: [],
                    most_played: []
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async addDeviceCompatibility(gameId: number, deviceType: DeviceType): Promise<QueryResult<void>> {
        try {
            const stmt = await this.addCompatibilityStmt;
            await stmt.run(gameId, deviceType);
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async removeDeviceCompatibility(gameId: number, deviceType: DeviceType): Promise<QueryResult<void>> {
        try {
            const stmt = await this.removeCompatibilityStmt;
            await stmt.run(gameId, deviceType);
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async delete(id: number): Promise<QueryResult<boolean>> {
        try {
            await this.handleQuery(async () => {
                return this.transaction(async () => {
                    const clearStmt = await this.clearCompatibilityStmt;
                    await clearStmt.run(id);
                    
                    const deleteStmt = await this.prepareStatement('DELETE FROM games WHERE id = ?');
                    await deleteStmt.run(id);
                    return true;
                });
            });

            return {
                success: true,
                data: true
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

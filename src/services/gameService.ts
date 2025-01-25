import { GameModel } from '../database/models/GameModel';
import { Game, DeviceType, QueryResult } from '../types';

export const gameService = {
    getGames: async (): Promise<QueryResult<Game[]>> => {
        try {
            const result = await GameModel.getInstance().findAll();
            if (!result.success) {
                return { success: false, error: result.error || 'Failed to get games' };
            }
            return { success: true, data: result.data };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    getGameById: async (id: number): Promise<QueryResult<Game>> => {
        try {
            const result = await GameModel.getInstance().findById(id);
            if (!result.success) {
                return { success: false, error: result.error || 'Game not found' };
            }
            return { success: true, data: result.data };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    createGame: async (game: Omit<Game, 'id' | 'created_at' | 'updated_at'>, device_types: [DeviceType]): Promise<QueryResult<number>> => {
        try {
            const result = await GameModel.getInstance().create({ ...game, device_types });
            if (!result.success) {
                return { success: false, error: result.error || 'Failed to create game' };
            }
            return { success: true, data: result.data };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    updateGame: async (id: number, game: Partial<Game>, device_types?: [DeviceType]): Promise<QueryResult<void>> => {
        try {
            const result = await GameModel.getInstance().update(id, { ...game, device_types });
            if (!result.success) {
                return { success: false, error: result.error || 'Failed to update game' };
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    deleteGame: async (id: number): Promise<QueryResult<void>> => {
        try {
            const result = await GameModel.getInstance().delete(id);
            if (!result.success) {
                return { success: false, error: result.error || 'Failed to delete game' };
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    getGameStats: () => {
        return GameModel.getInstance().getGameStats();
    }
};

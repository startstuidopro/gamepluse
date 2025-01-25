import { GameModel } from '../database/models/GameModel';
import { Game, DeviceType, QueryResult } from '../types';

export const gameService = {
    getGames: (): QueryResult<Game[]> => {
        return GameModel.getInstance().findAll();
    },

    getGameById: (id: number): QueryResult<Game> => {
        return GameModel.getInstance().findById(id);
    },

    createGame: (game: Omit<Game, 'id' | 'created_at' | 'updated_at'>, device_types: DeviceType[]): QueryResult<number> => {
        return GameModel.getInstance().create(game);
    },

    updateGame: (id: number, game: Partial<Game>, device_types?: DeviceType[]): QueryResult<void> => {
        return GameModel.getInstance().update(id, game, device_types);
    },

    deleteGame: (id: number): QueryResult<void> => {
        return GameModel.getInstance().delete(id);
    },

    getGameStats: () => {
        return GameModel.getInstance().getGameStats();
    }
};

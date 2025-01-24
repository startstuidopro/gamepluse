import { SessionModel } from '../database/models/SessionModel';
import { Session, QueryResult } from '../types';

export const sessionService = {
    createSession: async (session: Omit<Session, 'id' | 'created_at' | 'updated_at'>, controllerIds: number[]): Promise<QueryResult<number>> => {
        const instance = await SessionModel.getInstance();
        return instance.create(session, controllerIds);
    },

    endSession: async (id: number): Promise<QueryResult<void>> => {
        const instance = await SessionModel.getInstance();
        return instance.endSession(id, new Date().toISOString(), 0);
    },

    getActiveSession: async (deviceId: number): Promise<QueryResult<Session>> => {
        const instance = await SessionModel.getInstance();
        return instance.getActiveSession(deviceId);
    },

    addController: async (sessionId: number, controllerId: number): Promise<QueryResult<void>> => {
        const instance = await SessionModel.getInstance();
        return instance.addController(sessionId, controllerId);
    },

    removeController: async (sessionId: number, controllerId: number): Promise<QueryResult<void>> => {
        const instance = await SessionModel.getInstance();
        return instance.removeController(sessionId, controllerId);
    }
};

import { SessionModel } from '../database/models/SessionModel';
import { Session, QueryResult } from '../types';

export const sessionService = {
    createSession: (session: Omit<Session, 'id' | 'created_at' | 'updated_at'>, controllerIds: number[]): QueryResult<number> => {
        return SessionModel.getInstance().create(session, controllerIds);
    },

    endSession: (id: number): QueryResult<void> => {
        return SessionModel.getInstance().end(id);
    },

    getActiveSession: (deviceId: number): QueryResult<Session> => {
        return SessionModel.getInstance().getActiveSession(deviceId);
    },

    addController: (sessionId: number, controllerId: number): QueryResult<void> => {
        return SessionModel.getInstance().addController(sessionId, controllerId);
    },

    removeController: (sessionId: number, controllerId: number): QueryResult<void> => {
        return SessionModel.getInstance().removeController(sessionId, controllerId);
    }
};

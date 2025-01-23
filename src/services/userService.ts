import { UserModel } from '../database/models/UserModel';
import { User, QueryResult } from '../types';

export const userService = {
    getUsers: (): QueryResult<User[]> => {
        return UserModel.getInstance().findAll();
    },

    getUserById: (id: number): QueryResult<User> => {
        return UserModel.getInstance().findById(id);
    },

    getUserByPhone: (phone: string): QueryResult<User> => {
        return UserModel.getInstance().findByPhone(phone);
    },

    createUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): QueryResult<number> => {
        return UserModel.getInstance().create(user);
    },

    updateUser: (id: number, user: Partial<User>): QueryResult<void> => {
        return UserModel.getInstance().update(id, user);
    },

    searchUsers: (query: string): QueryResult<Array<{ id: number; name: string; phone: string }>> => {
        return UserModel.getInstance().search(query);
    },

    deleteUser: (id: number): QueryResult<void> => {
        return UserModel.getInstance().delete(id);
    }
};

import localforage from 'localforage';

const store = localforage.createInstance({
  name: 'my-app-db',
  storeName: 'users', // Name of the table-like structure
});
console.log(localforage)
interface User {
  id: number;
  username: string;
  email: string;
  password: string;
}

// Create a new user
export const createUser = async (user: User) => {
  try {
    await store.setItem(user.id.toString(), user);
    console.log('User added to database successfully');
  } catch (error) {
    console.error('Error adding user to database:', error);
  }
};

// Read a user by ID
export const readUser = async (id: number): Promise<User> => {
  try {
    const user = await store.getItem(id.toString());
    if (user) {
      return user as User;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Error retrieving user from database:', error);
    throw error;
  }
};

// Read a user by username
export const readUserByUsername = async (username: string): Promise<User | null> => {
  try {
    let foundUser = null;
    await store.iterate((user) => {
      if (user.username === username) {
        foundUser = user;
        return; // Stop iteration once found
      }
    });
    return foundUser;
  } catch (error) {
    console.error('Error retrieving user by username from database:', error);
    return null;
  }
};

// Update a user
export const updateUser = async (id: number, user: User) => {
  try {
    await store.setItem(id.toString(), user);
    console.log('User updated in database successfully');
  } catch (error) {
    console.error('Error updating user in database:', error);
  }
};

// Delete a user
export const deleteUser = async (id: number) => {
  try {
    await store.removeItem(id.toString());
    console.log('User deleted from database successfully');
  } catch (error) {
    console.error('Error deleting user from database:', error);
  }
};

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const users: User[] = [];
    await store.iterate((user) => {
      console.log('Iterating over user:', user); // Debug
      users.push(user as User);
    });
    console.log('All users retrieved:', users);
    return users;
  } catch (error) {
    console.error('Error retrieving all users from database:', error);
    return [];
  }
};

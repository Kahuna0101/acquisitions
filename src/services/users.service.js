import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { users } from '#models/user.model.js';
import { eq } from 'drizzle-orm';

export const getAllUsers = async () => {
  try {
    return await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      created_at: users.created_at,
      updated_at: users.updated_at,
    }).from(users);
  } catch (e) {
    logger.error('Error getting users', e);
    throw new Error('Error getting users');
  }
};

export const getUserById = async (id) => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      created_at: users.created_at,
      updated_at: users.updated_at,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (e) {
    logger.error(`Error getting user by id: ${id}`, e);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    // Check if user exists
    const existingUser = await getUserById(id);

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Perform the update
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      });

    logger.info(`User ${id} updated successfully`);
    return updatedUser;
  } catch (e) {
    logger.error(`Error updating user ${id}`, e);
    throw e;
  }
};

export const deleteUser = async (id) => {
  try {
    // Check if user exists
    const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Delete the user
    await db.delete(users).where(eq(users.id, id));

    logger.info(`User ${id} deleted successfully`);
    return { id };
  } catch (e) {
    logger.error(`Error deleting user ${id}`, e);
    throw e;
  }
};

import logger from '#config/logger.js';
import {
  getAllUsers,
  getUserById as getUser,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from '#services/users.service.js';
import { formatValidationError } from '#utils/format.js';
import {
  userIdSchema,
  updateUserSchema,
} from '#validations/users.validation.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Getting users ...');

    const allUsers = await getAllUsers();

    res.json({
      message: 'Successfully retrieved users',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (e) {
    logger.error('Error getting users', e);
    next(e);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    // Validate user ID
    const validationResult = userIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    logger.info(`Getting user with id: ${id}`);

    const user = await getUser(id);

    res.json({
      message: 'Successfully retrieved user',
      user,
    });
  } catch (e) {
    logger.error('Error getting user by id', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    // Validate user ID
    const idValidationResult = userIdSchema.safeParse(req.params);

    if (!idValidationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidationResult.error),
      });
    }

    const { id } = idValidationResult.data;

    // Validate update data
    const bodyValidationResult = updateUserSchema.safeParse(req.body);

    if (!bodyValidationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidationResult.error),
      });
    }

    const updates = bodyValidationResult.data;

    // Check authentication
    if (!req.user) {
      return res
        .status(401)
        .json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    // Users can only update their own information (unless admin)
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({
          error: 'Forbidden',
          message: 'You can only update your own information',
        });
    }

    // Only admins can change roles
    if (updates.role && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({
          error: 'Forbidden',
          message: 'Only admins can change user roles',
        });
    }

    logger.info(`Updating user with id: ${id}`);

    const updatedUser = await updateUserService(id, updates);

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (e) {
    logger.error('Error updating user', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    // Validate user ID
    const validationResult = userIdSchema.safeParse(req.params);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { id } = validationResult.data;

    // Check authentication
    if (!req.user) {
      return res
        .status(401)
        .json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    // Users can only delete their own account (unless admin)
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({
          error: 'Forbidden',
          message: 'You can only delete your own account',
        });
    }

    logger.info(`Deleting user with id: ${id}`);

    await deleteUserService(id);

    res.json({
      message: 'User deleted successfully',
    });
  } catch (e) {
    logger.error('Error deleting user', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(e);
  }
};

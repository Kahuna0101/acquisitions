import {
  fetchAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '#controllers/users.controller.js';
import { authenticate } from '#middleware/auth.middleware.js';
import express from 'express';

const usersRoutes = express.Router();

usersRoutes.get('/', authenticate, fetchAllUsers);
usersRoutes.get('/:id', authenticate, getUserById);
usersRoutes.put('/:id', authenticate, updateUser);
usersRoutes.delete('/:id', authenticate, deleteUser);

export default usersRoutes;

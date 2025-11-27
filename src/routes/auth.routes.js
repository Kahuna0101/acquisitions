import { signup, signin, signout } from '#controllers/auth.controller.js';
import express from 'express';

const authRoutes = express.Router();

authRoutes.post('/sign-up', signup);
authRoutes.post('/sign-in', signin);
authRoutes.post('/sign-out', signout);

export default authRoutes;

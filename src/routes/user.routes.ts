import { Router } from 'express';
import {
  createUser,
  getConsultants,
  getUsers,
  resendInvitation,
  updateUser,
  updateUserStatus,
} from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate.middleware';
import { Role } from '../models/User.model';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from '../validation/user.dto';

const router = Router();

// Staff users (admin, consultant, compliance) can view staff list
router.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE),
  getUsers
);

// Admin-only endpoints
router.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN),
  validateDto(CreateUserDto),
  createUser
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole(Role.ADMIN),
  validateDto(UpdateUserStatusDto),
  updateUserStatus
);

router.patch(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN),
  validateDto(UpdateUserDto),
  updateUser
);

router.post(
  '/:id/resend-invitation',
  requireAuth,
  requireRole(Role.ADMIN),
  resendInvitation
);

// Dropdown options
router.get('/consultants', requireAuth, getConsultants);

export default router;

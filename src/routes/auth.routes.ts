import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate.middleware';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from '../validation/auth.dto';

const router = Router();

router.post('/login', validateDto(LoginDto), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, validateDto(UpdateProfileDto), updateProfile);
router.post('/change-password', requireAuth, validateDto(ChangePasswordDto), changePassword);

router.post('/forgot-password', validateDto(ForgotPasswordDto), forgotPassword);
router.post('/reset-password', validateDto(ResetPasswordDto), resetPassword);

// For this specific endpoint, we require auth, but the service handles the specific role logic
// Wait, the requirement says "Admin can register consultant and compliance...".
// The service currently allows registering IF the current user is logged in (for Candidate) or if they are Admin.
// We apply `requireAuth` here to ensure `req.user` is populated for the service to check.
router.post('/register', requireAuth, validateDto(RegisterDto), register);

export default router;

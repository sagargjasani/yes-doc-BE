import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '../models/User.model';
import {
  addCandidate,
  sendRegistrationLink,
  getMe,
  submitApplicationForm,
  getSubmittedApplicationForms,
  getApplicationFormById,
  approveApplicationForm,
  requestApplicationFormChanges,
  searchCandidates,
  getCandidateById,
  updateCandidateProfile,
} from '../controllers/candidate.controller';
import {
  getCandidateTrainings,
  updateCandidateTrainings,
} from '../controllers/candidateTraining.controller';
import { generateComplianceForms } from '../controllers/compliance.controller';
import { validateDto } from '../middlewares/validate.middleware';
import { UpdateCandidateTrainingsDto } from '../validation/candidateTraining.dto';

const router = Router();

router.post('/add-candidate', requireAuth, addCandidate);
router.post('/send-registration-link', requireAuth, sendRegistrationLink);
router.get('/me', requireAuth, getMe);
router.put('/submit-application-form', requireAuth, submitApplicationForm);

router.get('/search', requireAuth, searchCandidates);
router.get('/application-form', requireAuth, getSubmittedApplicationForms);
router.get('/application-form/:id', requireAuth, getApplicationFormById);
router.put('/application-form/:id/approve', requireAuth, approveApplicationForm);
router.put('/application-form/:id/changes-required', requireAuth, requestApplicationFormChanges);

router.get('/:id/trainings', requireAuth, getCandidateTrainings);
router.put('/:id/trainings', requireAuth, validateDto(UpdateCandidateTrainingsDto), updateCandidateTrainings);

// Generates the staff profile documents for a candidate. Staff users only.
router.post(
  '/:id/compliance',
  requireAuth,
  requireRole(Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE),
  generateComplianceForms
);

router.get('/:id', requireAuth, getCandidateById);
router.put('/:id', requireAuth, updateCandidateProfile);

export default router;


import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
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
router.get('/:id', requireAuth, getCandidateById);
router.put('/:id', requireAuth, updateCandidateProfile);

export default router;

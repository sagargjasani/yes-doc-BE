import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { addCandidate, sendRegistrationLink, getMe, submitApplicationForm } from '../controllers/candidate.controller';

const router = Router();

router.post('/add-candidate', requireAuth, addCandidate);
router.post('/send-registration-link', requireAuth, sendRegistrationLink);
router.get('/me', requireAuth, getMe);
router.put('/submit-application-form', requireAuth, submitApplicationForm);

export default router;

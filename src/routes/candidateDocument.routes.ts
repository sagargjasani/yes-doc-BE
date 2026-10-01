import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate.middleware';
import { Role } from '../models/User.model';
import {
  getMyDocumentChecklist,
  listSubmittedCandidates,
  setMyVisaType,
  submitMyDocuments,
} from '../controllers/candidateDocument.controller';
import { SetVisaTypeDto } from '../validation/candidateDocument.dto';

const router = Router();

router.use(requireAuth);

// Candidate's own Candidate Documents
router.get('/me', requireRole(Role.CANDIDATE), getMyDocumentChecklist);
router.put('/me/visa-type', requireRole(Role.CANDIDATE), validateDto(SetVisaTypeDto), setMyVisaType);
router.post('/me/submit', requireRole(Role.CANDIDATE), submitMyDocuments);

// Reviewers
router.get('/submitted', requireRole(Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE), listSubmittedCandidates);

export default router;

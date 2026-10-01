import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate.middleware';
import { Role } from '../models/User.model';
import {
  getCandidateDocumentsForReview,
  getMyDocumentChecklist,
  listSubmittedCandidates,
  reviewCandidateDocuments,
  setMyVisaType,
  submitMyDocuments,
} from '../controllers/candidateDocument.controller';
import { ReviewDocumentsDto, SetVisaTypeDto } from '../validation/candidateDocument.dto';

const router = Router();

router.use(requireAuth);

// Candidate's own Candidate Documents
router.get('/me', requireRole(Role.CANDIDATE), getMyDocumentChecklist);
router.put('/me/visa-type', requireRole(Role.CANDIDATE), validateDto(SetVisaTypeDto), setMyVisaType);
router.post('/me/submit', requireRole(Role.CANDIDATE), submitMyDocuments);

// Reviewers
const reviewersOnly = requireRole(Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE);
router.get('/submitted', reviewersOnly, listSubmittedCandidates);
router.get('/:candidateId', reviewersOnly, getCandidateDocumentsForReview);
router.post('/:candidateId/review', reviewersOnly, validateDto(ReviewDocumentsDto), reviewCandidateDocuments);

export default router;

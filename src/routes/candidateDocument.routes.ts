import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate.middleware';
import { Role } from '../models/User.model';
import { getMyDocumentChecklist, setMyVisaType } from '../controllers/candidateDocument.controller';
import { SetVisaTypeDto } from '../validation/candidateDocument.dto';

const router = Router();

router.use(requireAuth);

// Candidate's own Candidate Documents
router.get('/me', requireRole(Role.CANDIDATE), getMyDocumentChecklist);
router.put('/me/visa-type', requireRole(Role.CANDIDATE), validateDto(SetVisaTypeDto), setMyVisaType);

export default router;

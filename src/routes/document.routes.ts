import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { getPresignedUploadUrl, confirmUpload, getDocumentDownloadUrl, getCandidateDocuments } from '../controllers/document.controller';

const router = Router();

router.use(requireAuth); // All document routes require authentication

router.post('/presigned-upload', getPresignedUploadUrl);
router.post('/confirm-upload', confirmUpload);
router.get('/candidate/:candidateId', getCandidateDocuments);
router.get('/:id/download-url', getDocumentDownloadUrl);

export default router;

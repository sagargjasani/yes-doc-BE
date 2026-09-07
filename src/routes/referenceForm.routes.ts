import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  sendReferenceRequest,
  getCandidateReferencesStatus,
  getPublicReferenceForm,
  submitPublicReferenceForm,
  getPublicPresignedUploadUrl,
  confirmPublicUpload,
  getSubmittedReferenceForms,
  approveReferenceForm,
  rejectReferenceForm,
} from '../controllers/referenceForm.controller';

const router = Router();

// Public routes for referee
router.get('/public/:token', getPublicReferenceForm);
router.post('/public/:token', submitPublicReferenceForm);
router.post('/public/:token/presigned-upload', getPublicPresignedUploadUrl);
router.post('/public/:token/confirm-upload', confirmPublicUpload);

// Protected routes for admin / compliance / consultant
router.post('/send', requireAuth, sendReferenceRequest);
router.get('/candidate/:candidateId', requireAuth, getCandidateReferencesStatus);
router.get('/submitted', requireAuth, getSubmittedReferenceForms);
router.post('/:id/approve', requireAuth, approveReferenceForm);
router.post('/:id/reject', requireAuth, rejectReferenceForm);

export default router;

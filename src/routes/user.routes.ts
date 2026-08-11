import { Router } from 'express';
import { getConsultants } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/consultants', requireAuth, getConsultants);

export default router;

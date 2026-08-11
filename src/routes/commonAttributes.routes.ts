import { Router } from 'express';
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from '../controllers/commonAttributes.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Retrieve common attributes (can filter by key using query params, e.g. ?keys=appliedFor,location)
router.get('/', requireAuth, getAttributes);

// Add a new attribute
router.post('/', requireAuth, createAttribute);

// Update an attribute
router.patch('/:id', requireAuth, updateAttribute);

// Delete an attribute
router.delete('/:id', requireAuth, deleteAttribute);

export default router;

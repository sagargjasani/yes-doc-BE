import { Router } from 'express';
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from '../controllers/commonAttributes.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validate.middleware';
import {
  CreateCommonAttributeDto,
  UpdateCommonAttributeDto,
} from '../validation/commonAttributes.dto';

const router = Router();

// Retrieve common attributes (can filter by key: ?keys=appliedFor,location, or search: ?search=London)
router.get('/', requireAuth, getAttributes);

// Add a new attribute
router.post('/', requireAuth, validateDto(CreateCommonAttributeDto), createAttribute);

// Update an attribute
router.patch('/:id', requireAuth, validateDto(UpdateCommonAttributeDto), updateAttribute);

// Delete an attribute
router.delete('/:id', requireAuth, deleteAttribute);

export default router;

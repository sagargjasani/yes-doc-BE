import { Request, Response, NextFunction } from 'express';
import CommonAttributesModel, { CommonAttributeKey } from '../models/CommonAttributes.model';

export const getAttributes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keysQuery = req.query.keys as string; // Expecting comma separated keys, e.g., 'appliedFor,location'
    let filter = {};
    
    if (keysQuery) {
      const keysArray = keysQuery.split(',').map((k) => k.trim());
      filter = { key: { $in: keysArray } };
    }

    const attributes = await CommonAttributesModel.find(filter).sort({ key: 1, value: 1 });
    
    res.status(200).json({
      status: 'success',
      data: { attributes },
    });
  } catch (error) {
    next(error);
  }
};

export const createAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    
    if (!key || !value) {
      return res.status(400).json({ status: 'fail', message: 'Key and value are required.' });
    }

    const newAttribute = await CommonAttributesModel.create({ key, value });

    res.status(201).json({
      status: 'success',
      data: { attribute: newAttribute },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ status: 'fail', message: 'Value is required to update.' });
    }

    const updatedAttribute = await CommonAttributesModel.findByIdAndUpdate(
      id,
      { value },
      { new: true, runValidators: true }
    );

    if (!updatedAttribute) {
      return res.status(404).json({ status: 'fail', message: 'Attribute not found.' });
    }

    res.status(200).json({
      status: 'success',
      data: { attribute: updatedAttribute },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deletedAttribute = await CommonAttributesModel.findByIdAndDelete(id);

    if (!deletedAttribute) {
      return res.status(404).json({ status: 'fail', message: 'Attribute not found.' });
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

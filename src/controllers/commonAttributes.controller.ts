import { Request, Response, NextFunction } from 'express';
import { commonAttributesService } from '../services/commonAttributes.service';

export const getAttributes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keysQuery = req.query.keys as string | undefined;
    const searchQuery = req.query.search as string | undefined;

    let keysArray: string[] | undefined;
    if (keysQuery) {
      keysArray = keysQuery.split(',').map((k) => k.trim()).filter(Boolean);
    }

    const attributes = await commonAttributesService.getAttributes(keysArray, searchQuery);

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
    const newAttribute = await commonAttributesService.createAttribute(req.body);

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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updatedAttribute = await commonAttributesService.updateAttribute(id, req.body);

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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await commonAttributesService.deleteAttribute(id);

    res.status(200).json({
      status: 'success',
      message: 'Attribute deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

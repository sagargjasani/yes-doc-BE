import CommonAttributesModel, { CommonAttributeKey } from '../models/CommonAttributes.model';
import { CreateCommonAttributeDto, UpdateCommonAttributeDto } from '../validation/commonAttributes.dto';
import { AppError } from '../utils/AppError';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export class CommonAttributesService {
  async getAttributes(keys?: string[], search?: string) {
    const filter: Record<string, any> = {};

    if (keys && keys.length > 0) {
      filter.key = { $in: keys };
    }

    if (search && search.trim()) {
      filter.value = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    return CommonAttributesModel.find(filter)
      .collation({ locale: 'en', strength: 2 })
      .sort({ value: 1 });
  }

  async createAttribute(dto: CreateCommonAttributeDto) {
    const trimmedValue = dto.value.trim();

    // Check for duplicate value under the same key (case-insensitive)
    const existing = await CommonAttributesModel.findOne({
      key: dto.key,
      value: { $regex: `^${escapeRegex(trimmedValue)}$`, $options: 'i' },
    });

    if (existing) {
      throw new AppError(`An attribute with value "${trimmedValue}" already exists under ${dto.key}`, 400);
    }

    return CommonAttributesModel.create({
      key: dto.key,
      value: trimmedValue,
    });
  }

  async updateAttribute(id: string, dto: UpdateCommonAttributeDto) {
    const trimmedValue = dto.value.trim();

    const existing = await CommonAttributesModel.findById(id);
    if (!existing) {
      throw new AppError('Attribute not found', 404);
    }

    // Check for duplicate value under the same key (case-insensitive)
    const duplicate = await CommonAttributesModel.findOne({
      _id: { $ne: id },
      key: existing.key,
      value: { $regex: `^${escapeRegex(trimmedValue)}$`, $options: 'i' },
    });

    if (duplicate) {
      throw new AppError(`An attribute with value "${trimmedValue}" already exists under ${existing.key}`, 400);
    }

    existing.value = trimmedValue;
    await existing.save();

    return existing;
  }

  async deleteAttribute(id: string) {
    const deleted = await CommonAttributesModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError('Attribute not found', 404);
    }
    return deleted;
  }
}

export const commonAttributesService = new CommonAttributesService();

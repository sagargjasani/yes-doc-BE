import CandidateProfileModel from '../models/CandidateProfile.model';
import CandidateTrainingsModel, {
  CandidateTrainings,
  TrainingType,
  TRAINING_CONFIGS,
} from '../models/CandidateTrainings.model';
import { UpdateCandidateTrainingsDto } from '../validation/candidateTraining.dto';
import { AppError } from '../utils/AppError';

export class CandidateTrainingService {
  /**
   * Fetch candidate trainings by candidate ID.
   * If record doesn't exist yet, returns an initialized default instance.
   */
  async getCandidateTrainings(candidateId: string): Promise<CandidateTrainings> {
    const candidate = await CandidateProfileModel.findById(candidateId);
    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }

    let trainings = await CandidateTrainingsModel.findOne({ candidate: candidateId });
    if (!trainings) {
      trainings = await CandidateTrainingsModel.create({ candidate: candidateId });
    }

    return trainings;
  }

  /**
   * Update / upsert candidate trainings with partial merge.
   * Enforces practical-only requirement on Moving and Handling.
   */
  async updateCandidateTrainings(
    candidateId: string,
    updateData: UpdateCandidateTrainingsDto
  ): Promise<CandidateTrainings> {
    const candidate = await CandidateProfileModel.findById(candidateId);
    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }

    // Strict validation for Moving and Handling
    if (
      updateData.movingAndHandling?.type &&
      updateData.movingAndHandling.type !== TrainingType.PRACTICAL
    ) {
      throw new AppError(
        'Moving and Handling training must be completed practically',
        400
      );
    }

    // Build partial nested update query for MongoDB
    const setFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (!value || typeof value !== 'object' || !(key in TRAINING_CONFIGS)) {
        continue;
      }

      const training = value as { name?: string; type?: TrainingType | null; date?: string | null };

      if (training.name !== undefined) {
        setFields[`${key}.name`] = training.name;
      }
      if (training.type !== undefined) {
        setFields[`${key}.type`] = training.type;
      }
      if (training.date !== undefined) {
        setFields[`${key}.date`] = training.date ? new Date(training.date) : null;
      }
    }

    const updatedRecord = await CandidateTrainingsModel.findOneAndUpdate(
      { candidate: candidateId },
      { $set: setFields },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return updatedRecord;
  }
}

export const candidateTrainingService = new CandidateTrainingService();

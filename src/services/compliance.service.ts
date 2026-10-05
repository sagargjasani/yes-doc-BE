import path from 'path';
import fse from 'fs-extra';
import dayjs from 'dayjs';
import CandidateProfileModel, { CandidateProfile } from '../models/CandidateProfile.model';
import {
  CandidateTrainings,
  TRAINING_CONFIGS,
  TrainingType,
} from '../models/CandidateTrainings.model';
import DocumentModel, { DocumentCategory } from '../models/Document.model';
import { complianceFormsList, ComplianceFormDefinition } from '../constants/complianceFormsList';
import { candidateTrainingService } from './candidateTraining.service';
import PizZip from 'pizzip';
import { imageSize } from 'image-size';
import { generateDocx } from '../utils/docx';
import { renderPdfFirstPage } from '../utils/pdfToPng';
import { downloadS3File, getCandidateS3Key, uploadS3File } from './s3.service';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME_TYPE = 'application/pdf';

/** Largest size (px) of an evidence image; fits the narrowest evidence column (Clarity, ~227px inside its margins). */
const EVIDENCE_IMAGE_BOX = { width: 220, height: 300 };

/** Required Document key → image buffer, for the `{%images.<key>}` tags. */
export type EvidenceImages = Map<string, Buffer>;

/** A single work experience entry as consumed by `{#experiences}` blocks. */
export interface ComplianceExperienceData {
  organization: string;
  positionHeld: string;
  location: string;
  /** Kept raw so the `formatDate:"MMM YYYY"` filter can format it. */
  startDate: Date | string | null;
  endDate: Date | string | null;
}

/** A single mandatory training row as consumed by `trainings.<key>` tags. */
export interface ComplianceTrainingData {
  name: string;
  type: TrainingType | null;
  /** Kept raw so the `formatDate` filter can format it. */
  date: Date | string | null;
}

/**
 * The single object handed to docxtemplater. Built from the candidate profile
 * plus the candidate trainings record.
 */
export interface ComplianceRenderData {
  fullName: string;
  fullAddress: string;
  dateOfBirth: string;
  dbsNumber: string;
  appliedFor: string;
  experiences: ComplianceExperienceData[];
  trainings: Record<string, ComplianceTrainingData>;
  [key: string]: unknown;
}

export interface GeneratedComplianceForm {
  documentId: string;
  documentName: string;
  fileName: string;
  s3Key: string;
  size: number;
  tempPath: string;
}

export interface GeneratedComplianceForms {
  candidateId: string;
  generatedAt: string;
  tempDirectory: string;
  total: number;
  files: GeneratedComplianceForm[];
}

type AddressParts = Pick<
  CandidateProfile,
  'addressLine1' | 'addressLine2' | 'townOrCity' | 'county' | 'postcode'
>;

const buildFullName = (candidate: CandidateProfile): string =>
  [candidate.firstName, candidate.middleName, candidate.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ');

const buildFullAddress = (candidate: AddressParts): string =>
  [
    candidate.addressLine1,
    candidate.addressLine2,
    candidate.townOrCity,
    candidate.county,
    candidate.postcode,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');

const buildExperiences = (
  experiences: CandidateProfile['experiences']
): ComplianceExperienceData[] =>
  (experiences || []).map((experience) => ({
    organization: experience.organization || '',
    positionHeld: experience.positionHeld || '',
    location: experience.location || '',
    startDate: experience.startDate ?? null,
    endDate: experience.endDate ?? null,
  }));

const buildTrainings = (
  trainings: CandidateTrainings
): Record<string, ComplianceTrainingData> => {
  const entries = trainings as unknown as Record<
    string,
    { name?: string; type?: TrainingType | null; date?: Date | null } | undefined
  >;

  return Object.entries(TRAINING_CONFIGS).reduce<Record<string, ComplianceTrainingData>>(
    (acc, [key, config]) => {
      const entry = entries[key];
      acc[key] = {
        name: entry?.name || config.name,
        type: entry?.type ?? null,
        date: entry?.date ?? null,
      };
      return acc;
    },
    {}
  );
};

/**
 * Merges the candidate profile and its trainings into the single render object
 * expected by every staff profile template.
 */
export const buildComplianceRenderData = (
  profile: CandidateProfile,
  trainings: CandidateTrainings
): ComplianceRenderData => ({
  fullName: buildFullName(profile),
  fullAddress: buildFullAddress(profile),
  // The templates print {dateOfBirth} unfiltered, so it is pre-formatted here.
  dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth).format('DD/MM/YYYY') : '',
  dbsNumber: profile.dbsNumber || '',
  appliedFor: profile.appliedFor || '',
  email: profile.email || '',
  mobile: profile.mobile || '',
  niNumber: profile.niNumber || '',
  postcode: profile.postcode || '',
  // Kept with raw dates so the `formatDate:"MMM YYYY"` filter still applies.
  experiences: buildExperiences(profile.experiences),
  trainings: buildTrainings(trainings),
});

/** Required Document keys used by `{%images.<key>}` tags across every staff profile template. */
const scanEvidenceImageKeys = async (): Promise<string[]> => {
  const keys = new Set<string>();
  for (const form of complianceFormsList) {
    const zip = new PizZip(await fse.readFile(form.templatePath));
    const text = zip.file('word/document.xml')!.asText().replace(/<[^>]+>/g, '');
    for (const [, key] of text.matchAll(/\{%images\.(\w+)\}/g)) keys.add(key);
  }
  return [...keys];
};

// The templates only change with a deploy, so they are scanned once per process.
let evidenceImageKeys: Promise<string[]> | null = null;
const getEvidenceImageKeys = () => (evidenceImageKeys ??= scanEvidenceImageKeys());

/**
 * Downloads the Candidate Documents the templates show as evidence and turns each into an
 * embeddable image: PNG/JPG as-is, PDFs as a render of their first page.
 * Any failure aborts generation, so a Profile never silently lacks evidence.
 */
export const buildEvidenceImages = async (candidateId: string): Promise<EvidenceImages> => {
  const documents = await DocumentModel.find({
    candidate: candidateId,
    category: DocumentCategory.DOCUMENT,
    documentName: { $in: await getEvidenceImageKeys() },
  });

  const images: EvidenceImages = new Map();
  for (const document of documents) {
    try {
      const file = await downloadS3File(document.s3Key);
      if (document.mimeType !== PDF_MIME_TYPE) {
        images.set(document.documentName, file);
        continue;
      }

      const { png, pageCount } = await renderPdfFirstPage(file);
      if (pageCount > 1) {
        logger.warn(
          `${document.documentName} for candidate ${candidateId} has ${pageCount} pages; only the first is shown`
        );
      }
      images.set(document.documentName, png);
    } catch (error) {
      logger.error(`Failed to prepare ${document.documentName} image for candidate ${candidateId}`, error);
      throw new AppError(`Failed to prepare the ${document.documentName} image`, 500);
    }
  }
  return images;
};

/** Scales an image down to fit the evidence column, keeping its aspect ratio. */
const fitEvidenceImage = (image: Buffer): [number, number] => {
  const { width = EVIDENCE_IMAGE_BOX.width, height = EVIDENCE_IMAGE_BOX.height } = imageSize(image);
  const scale = Math.min(1, EVIDENCE_IMAGE_BOX.width / width, EVIDENCE_IMAGE_BOX.height / height);
  return [Math.round(width * scale), Math.round(height * scale)];
};

const renderTemplate = async (
  form: ComplianceFormDefinition,
  renderData: ComplianceRenderData,
  evidenceImages: EvidenceImages
): Promise<Buffer> => {
  try {
    return await generateDocx({
      templatePath: form.templatePath,
      data: renderData,
      // The image module treats any object tag value as already resolved, so tags carry
      // the Required Document key and the buffer is looked up here.
      imageOptions: {
        getImage: (key) => evidenceImages.get(key)!,
        getSize: (image) => fitEvidenceImage(image),
      },
      // Training dates are legitimately null until completed, which would otherwise
      // flood the logs with "missing tag" warnings on every generation.
      nullGetter: () => '',
    });
  } catch (error) {
    logger.error(`Failed to generate compliance form "${form.originalName}"`, error);
    throw new AppError(`Failed to generate ${form.originalName}`, 500);
  }
};

/**
 * Generates every staff profile document for a candidate:
 * renders each template, writes it to ./temps/<candidateId>/, uploads it to S3
 * and upserts the matching Document record.
 */
export const generateComplianceForms = async (
  candidateId: string
): Promise<GeneratedComplianceForms> => {
  const profile = await CandidateProfileModel.findById(candidateId);
  if (!profile) {
    throw new AppError('Candidate profile not found', 404);
  }

  const trainings = await candidateTrainingService.getCandidateTrainings(candidateId);
  // Built before anything is uploaded, so a failure here leaves no partial set of Profiles.
  const evidenceImages = await buildEvidenceImages(candidateId);
  const renderData = {
    ...buildComplianceRenderData(profile, trainings),
    images: Object.fromEntries([...evidenceImages.keys()].map((key) => [key, key])),
    todayDate: dayjs().format('DD/MM/YYYY'),
  };

  // Relative to the backend working directory, i.e. backend/temps/<candidateId>/
  const tempDirectory = path.join('./temps', candidateId);
  await fse.ensureDir(tempDirectory);

  const files: GeneratedComplianceForm[] = [];

  for (const form of complianceFormsList) {
    const docxBuffer = await renderTemplate(form, renderData, evidenceImages);

    const tempPath = path.join(tempDirectory, form.s3FileName);
    await fse.writeFile(tempPath, docxBuffer);

    const s3Key = getCandidateS3Key(
      candidateId,
      DocumentCategory.PROFILE,
      form.s3FileName.replace(/\.docx$/i, ''),
      'docx'
    );
    await uploadS3File(s3Key, docxBuffer, DOCX_MIME_TYPE);

    const document = await DocumentModel.findOneAndUpdate(
      {
        candidate: candidateId,
        category: DocumentCategory.PROFILE,
        documentName: form.documentName,
      },
      {
        candidate: candidateId,
        s3Key,
        originalName: form.originalName,
        mimeType: DOCX_MIME_TYPE,
        category: DocumentCategory.PROFILE,
        documentName: form.documentName,
        size: docxBuffer.length,
      },
      { new: true, upsert: true }
    );

    files.push({
      documentId: document._id.toString(),
      documentName: form.documentName,
      fileName: form.originalName,
      s3Key,
      size: docxBuffer.length,
      tempPath,
    });
  }

  logger.info(
    `Generated ${files.length} compliance form(s) for candidate ${candidateId} in ${tempDirectory}`
  );

  return {
    candidateId,
    generatedAt: dayjs().toISOString(),
    // Absolute path so the UI can show where the files were written.
    tempDirectory: path.resolve(tempDirectory),
    total: files.length,
    files: files.map((file) => ({ ...file, tempPath: path.resolve(file.tempPath) })),
  };
};

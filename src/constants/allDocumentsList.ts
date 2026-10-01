import { VisaType } from '../models/CandidateProfile.model';

export interface RequiredDocumentDefinition {
  key: string; // stable key, stored as Document.documentName for category Document
  label: string; // shown to the user
  hint: string | null; // extra guidance shown under the label
  visaTypes: VisaType[]; // Visa Types this Required Document applies to
}

const ALL_VISA_TYPES = Object.values(VisaType);
const NON_BRITISH_IRISH = ALL_VISA_TYPES.filter((visaType) => visaType !== VisaType.BRITISH_IRISH);

export const visaTypeOptions: { value: VisaType; label: string }[] = [
  { value: VisaType.BRITISH_IRISH, label: 'British / Irish' },
  { value: VisaType.SETTLED, label: 'Settled / Pre-settled' },
  { value: VisaType.STUDENT, label: 'Student' },
  { value: VisaType.DEPENDANT, label: 'Dependant' },
  { value: VisaType.SKILLED_WORKER, label: 'Skilled Worker / Sponsored' },
];

export const allDocumentsList: RequiredDocumentDefinition[] = [
  {
    key: 'CV',
    label: 'CV',
    hint: 'Up to date, with all care and support experience. All gaps of more than a month must be explained.',
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'Passport',
    label: 'Passport',
    hint: 'Like an open book, clear scanned copy.',
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'OnlineImmigrationStatus',
    label: 'Online Immigration Status',
    hint: null,
    visaTypes: NON_BRITISH_IRISH,
  },
  {
    key: 'RightToWorkShareCode',
    label: 'Right to Work share code',
    hint: null,
    visaTypes: NON_BRITISH_IRISH,
  },
  {
    key: 'MandatoryPracticalTrainingCertificate',
    label: 'Mandatory Practical Training Certificate',
    hint: null,
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'MedicationTrainingCertificate',
    label: 'Medication Training Certificate',
    hint: null,
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'EnhancedDbsCertificate',
    label: 'Enhanced DBS Certificate',
    hint: 'On the update service, issued within the last year.',
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'CovidVaccinationCard',
    label: 'Covid Vaccination Card',
    hint: null,
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'CovidNhsPass',
    label: 'Covid NHS Pass',
    hint: null,
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'ProofOfAddress1',
    label: 'Proof of Address 1',
    hint: 'Recent bank statement, utility bill or HMRC letter.',
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'ProofOfAddress2',
    label: 'Proof of Address 2',
    hint: 'A second recent bank statement, utility bill or HMRC letter.',
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'IdBadgePhoto',
    label: 'Photo for ID Badge',
    hint: null,
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'NationalInsurance',
    label: 'National Insurance Card or Letter',
    hint: null,
    visaTypes: ALL_VISA_TYPES,
  },
  {
    key: 'TermLetter',
    label: 'Term Letter',
    hint: null,
    visaTypes: [VisaType.STUDENT],
  },
  {
    key: 'EnrolmentLetter',
    label: 'Enrolment Letter',
    hint: null,
    visaTypes: [VisaType.STUDENT],
  },
  {
    key: 'SpousePassport',
    label: "Spouse's Passport",
    hint: null,
    visaTypes: [VisaType.DEPENDANT],
  },
  {
    key: 'CosLetter',
    label: 'COS Letter',
    hint: null,
    visaTypes: [VisaType.SKILLED_WORKER],
  },
];

/** The single source of truth for which Required Documents a Candidate must provide. */
export const getApplicableRequiredDocuments = (visaType?: VisaType | null): RequiredDocumentDefinition[] =>
  visaType ? allDocumentsList.filter((doc) => doc.visaTypes.includes(visaType)) : [];

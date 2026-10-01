import { Role } from '../src/models/User.model';
import DocumentModel, { DocumentCategory } from '../src/models/Document.model';
import CandidateProfileModel from '../src/models/CandidateProfile.model';
import { loginAs } from './helpers/auth';

const APPROVED = { applicationStatus: 'APPLICATION_FORM_APPROVED' };

const COMMON = [
  'CV',
  'Passport',
  'MandatoryPracticalTrainingCertificate',
  'MedicationTrainingCertificate',
  'EnhancedDbsCertificate',
  'CovidVaccinationCard',
  'CovidNhsPass',
  'ProofOfAddress1',
  'ProofOfAddress2',
  'IdBadgePhoto',
  'NationalInsurance',
];
const IMMIGRATION = ['OnlineImmigrationStatus', 'RightToWorkShareCode'];

const keysOf = (body: { data: { checklist: { key: string }[] } }) =>
  body.data.checklist.map((item) => item.key).sort();

describe('Candidate document checklist', () => {
  describe('before a Visa Type is chosen', () => {
    it('returns Not Submitted, no Visa Type, the Visa Type options and an empty checklist', async () => {
      const { agent } = await loginAs(Role.CANDIDATE, APPROVED);

      const res = await agent.get('/api/candidate-documents/me');

      expect(res.status).toBe(200);
      expect(res.body.data.visaType).toBeNull();
      expect(res.body.data.documentStatus).toBe('NOT_SUBMITTED');
      expect(res.body.data.checklist).toEqual([]);
      expect(res.body.data.visaTypeOptions.map((o: { value: string }) => o.value)).toEqual([
        'BRITISH_IRISH',
        'SETTLED',
        'STUDENT',
        'DEPENDANT',
        'SKILLED_WORKER',
      ]);
    });
  });

  it('treats an existing profile without document fields as Not Submitted with no Visa Type', async () => {
    const { agent, profile } = await loginAs(Role.CANDIDATE, APPROVED);
    await CandidateProfileModel.collection.updateOne(
      { _id: profile!._id },
      { $unset: { documentStatus: '', visaType: '' } }
    );

    const res = await agent.get('/api/candidate-documents/me');

    expect(res.status).toBe(200);
    expect(res.body.data.documentStatus).toBe('NOT_SUBMITTED');
    expect(res.body.data.visaType).toBeNull();
  });

  describe('applicable Required Documents per Visa Type', () => {
    it.each([
      ['BRITISH_IRISH', COMMON],
      ['SETTLED', [...COMMON, ...IMMIGRATION]],
      ['STUDENT', [...COMMON, ...IMMIGRATION, 'TermLetter', 'EnrolmentLetter']],
      ['DEPENDANT', [...COMMON, ...IMMIGRATION, 'SpousePassport']],
      ['SKILLED_WORKER', [...COMMON, ...IMMIGRATION, 'CosLetter']],
    ])('%s', async (visaType, expected) => {
      const { agent } = await loginAs(Role.CANDIDATE, APPROVED);

      const put = await agent.put('/api/candidate-documents/me/visa-type').send({ visaType });
      expect(put.status).toBe(200);
      expect(keysOf(put.body)).toEqual([...expected].sort());

      const get = await agent.get('/api/candidate-documents/me');
      expect(get.body.data.visaType).toBe(visaType);
      expect(keysOf(get.body)).toEqual([...expected].sort());
    });

    it('covers all 17 Required Documents across Visa Types, each with a label and hint field', async () => {
      const { agent } = await loginAs(Role.CANDIDATE, APPROVED);
      const all = new Map<string, { label: string; hint: string | null }>();

      for (const visaType of ['BRITISH_IRISH', 'SETTLED', 'STUDENT', 'DEPENDANT', 'SKILLED_WORKER']) {
        const res = await agent.put('/api/candidate-documents/me/visa-type').send({ visaType });
        for (const item of res.body.data.checklist) all.set(item.key, item);
      }

      expect(all.size).toBe(17);
      for (const item of all.values()) {
        expect(item.label).toEqual(expect.any(String));
        expect(item).toHaveProperty('hint');
      }
    });
  });

  it('rejects an invalid Visa Type', async () => {
    const { agent } = await loginAs(Role.CANDIDATE, APPROVED);

    const res = await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'TOURIST' });

    expect(res.status).toBe(400);
  });

  it('shows an uploaded Candidate Document as Pending, and ignores generated Forms', async () => {
    const { agent, profile } = await loginAs(Role.CANDIDATE, APPROVED);
    await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'BRITISH_IRISH' });
    await DocumentModel.create({
      candidate: profile!._id,
      s3Key: 'k/passport.pdf',
      documentName: 'Passport',
      originalName: 'my-passport.pdf',
      mimeType: 'application/pdf',
      category: DocumentCategory.DOCUMENT,
      size: 100,
    });
    await DocumentModel.create({
      candidate: profile!._id,
      s3Key: 'k/cv-form.docx',
      documentName: 'CV',
      originalName: 'CV.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      category: DocumentCategory.FORM,
      size: 100,
    });

    const res = await agent.get('/api/candidate-documents/me');
    const byKey = Object.fromEntries(res.body.data.checklist.map((i: { key: string }) => [i.key, i]));

    expect(byKey.Passport.document).toMatchObject({
      originalName: 'my-passport.pdf',
      mimeType: 'application/pdf',
      reviewStatus: 'PENDING',
      rejectionReason: null,
    });
    expect(byKey.CV.document).toBeNull();
  });

  describe('access', () => {
    it.each(['INITIATED', 'APPLICATION_FORM_SENT', 'APPLICATION_FORM_SUBMITTED'])(
      'refuses a Candidate whose application form is %s',
      async (applicationStatus) => {
        const { agent } = await loginAs(Role.CANDIDATE, { applicationStatus });

        const get = await agent.get('/api/candidate-documents/me');
        const put = await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'STUDENT' });

        expect(get.status).toBe(403);
        expect(put.status).toBe(403);
      }
    );

    it('refuses staff users', async () => {
      const { agent } = await loginAs(Role.ADMIN);

      const res = await agent.get('/api/candidate-documents/me');

      expect(res.status).toBe(403);
    });
  });
});

import { Role } from '../src/models/User.model';
import DocumentModel, { DocumentCategory, ReviewStatus } from '../src/models/Document.model';
import { deleteS3File } from '../src/services/s3.service';
import { loginAs } from './helpers/auth';
import { APPROVED, candidateWithVisaType, checklistItem, upload } from './helpers/documents';

describe('Candidate upload per Required Document', () => {
  it.each([
    ['application/pdf', 'passport.pdf'],
    ['image/jpeg', 'passport.jpg'],
    ['image/png', 'passport.png'],
  ])('accepts %s and shows it as Uploaded and Pending', async (mimeType, filename) => {
    const { agent } = await candidateWithVisaType();

    const { presigned, confirm } = await upload(agent, 'Passport', { mimeType, filename });

    expect(presigned.status).toBe(200);
    expect(confirm?.status).toBe(201);
    expect((await checklistItem(agent, 'Passport'))?.document).toMatchObject({
      originalName: filename,
      mimeType,
      reviewStatus: 'PENDING',
      rejectionReason: null,
    });
  });

  it.each([
    'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])('refuses %s at both presign and confirm', async (mimeType) => {
    const { agent } = await candidateWithVisaType();

    const presigned = await agent.post('/api/documents/presigned-upload').send({
      filename: 'x.bin', contentType: mimeType, category: DocumentCategory.DOCUMENT, size: 1000, documentName: 'Passport',
    });
    const confirm = await agent.post('/api/documents/confirm-upload').send({
      s3Key: 'some/key', originalName: 'x.bin', mimeType, category: DocumentCategory.DOCUMENT, size: 1000, documentName: 'Passport',
    });

    expect(presigned.status).toBe(400);
    expect(confirm.status).toBe(400);
    expect(await DocumentModel.countDocuments()).toBe(0);
  });

  it('refuses a Required Document that does not apply to the Visa Type', async () => {
    const { agent } = await candidateWithVisaType('BRITISH_IRISH');

    const { presigned } = await upload(agent, 'TermLetter');

    expect(presigned.status).toBe(400);
  });

  it('refuses a key that is not a Required Document at all', async () => {
    const { agent } = await candidateWithVisaType();

    const { presigned } = await upload(agent, 'HolidayPhotos');

    expect(presigned.status).toBe(400);
  });

  it('refuses uploads before a Visa Type is chosen', async () => {
    const { agent } = await loginAs(Role.CANDIDATE, APPROVED);

    const { presigned } = await upload(agent, 'Passport');

    expect(presigned.status).toBe(400);
  });

  it('refuses uploads before the application form is approved', async () => {
    const { agent } = await loginAs(Role.CANDIDATE, { applicationStatus: 'APPLICATION_FORM_SUBMITTED' });

    const { presigned } = await upload(agent, 'Passport');

    expect(presigned.status).toBe(403);
  });

  it('replaces the file on re-upload, keeping one Candidate Document and deleting the old S3 object', async () => {
    const { agent } = await candidateWithVisaType();
    const first = await upload(agent, 'Passport', { mimeType: 'application/pdf', filename: 'old.pdf' });
    const oldKey = first.presigned.body.data.s3Key;

    await upload(agent, 'Passport', { mimeType: 'image/png', filename: 'new.png' });

    expect(await DocumentModel.countDocuments({ documentName: 'Passport' })).toBe(1);
    expect((await checklistItem(agent, 'Passport'))?.document?.originalName).toBe('new.png');
    expect(deleteS3File).toHaveBeenCalledWith(oldKey);
  });

  it('resets a Rejected Candidate Document to Pending and clears the Rejection Reason on re-upload', async () => {
    const { agent } = await candidateWithVisaType();
    await upload(agent, 'Passport');
    await DocumentModel.updateOne(
      { documentName: 'Passport' },
      { reviewStatus: ReviewStatus.REJECTED, rejectionReason: 'Blurry scan' }
    );

    await upload(agent, 'Passport', { filename: 'clear-scan.pdf' });

    expect((await checklistItem(agent, 'Passport'))?.document).toMatchObject({
      originalName: 'clear-scan.pdf',
      reviewStatus: 'PENDING',
      rejectionReason: null,
    });
  });

  it('hides, but keeps, files for Required Documents that stop applying after a Visa Type change', async () => {
    const { agent } = await candidateWithVisaType('STUDENT');
    await upload(agent, 'TermLetter');

    await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'BRITISH_IRISH' });
    expect(await checklistItem(agent, 'TermLetter')).toBeUndefined();
    expect(await DocumentModel.countDocuments({ documentName: 'TermLetter' })).toBe(1);

    await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'STUDENT' });
    expect((await checklistItem(agent, 'TermLetter'))?.document).not.toBeNull();
  });

  it('always uploads to the Candidate\'s own profile, ignoring a candidateId in the request', async () => {
    const { agent, profile } = await candidateWithVisaType();
    const other = await loginAs(Role.CANDIDATE, APPROVED);

    await upload(agent, 'Passport', { candidateId: other.profile!._id.toString() });

    const doc = await DocumentModel.findOne({ documentName: 'Passport' });
    expect(doc?.candidate.toString()).toBe(profile!._id.toString());
  });

  it.each([
    ['another Candidate\'s file', (otherId: string) => `candidates/${otherId}/Document/Passport.pdf`],
    ['a different Required Document\'s file', (_: string, ownId: string) => `candidates/${ownId}/Document/CV.pdf`],
  ])('refuses to confirm an s3Key pointing at %s', async (_, keyFor) => {
    const { agent, profile } = await candidateWithVisaType();
    const other = await loginAs(Role.CANDIDATE, APPROVED);
    const s3Key = keyFor(other.profile!._id.toString(), profile!._id.toString());

    const confirm = await agent.post('/api/documents/confirm-upload').send({
      s3Key, originalName: 'x.pdf', mimeType: 'application/pdf', category: DocumentCategory.DOCUMENT, size: 1000, documentName: 'Passport',
    });

    expect(confirm.status).toBe(400);
    expect(await DocumentModel.countDocuments()).toBe(0);
  });

  it('leaves staff uploads of free-form Documents unaffected', async () => {
    const { profile } = await loginAs(Role.CANDIDATE, APPROVED);
    const { agent: staff } = await loginAs(Role.ADMIN);

    const { presigned, confirm } = await upload(staff, 'Reference letter', {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'reference.docx',
      candidateId: profile!._id.toString(),
    });

    expect(presigned.status).toBe(200);
    expect(confirm?.status).toBe(201);
  });
});

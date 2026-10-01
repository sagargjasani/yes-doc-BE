import { Role } from '../src/models/User.model';
import DocumentModel, { ReviewStatus } from '../src/models/Document.model';
import { loginAs } from './helpers/auth';
import { APPROVED, candidateWithVisaType, upload, uploadAllRequired } from './helpers/documents';

const reviewUrl = (candidateId: string) => `/api/candidate-documents/${candidateId}`;

const submittedCandidate = async (visaType = 'BRITISH_IRISH') => {
  const session = await candidateWithVisaType(visaType);
  await uploadAllRequired(session.agent);
  await session.agent.post('/api/candidate-documents/me/submit');
  return session;
};

describe('Reviewer view of one Candidate\'s documents', () => {
  it('returns the Candidate, Visa Type, Document Status and every applicable Candidate Document', async () => {
    const { profile } = await submittedCandidate();
    const { agent } = await loginAs(Role.COMPLIANCE);

    const res = await agent.get(reviewUrl(profile!._id.toString()));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      visaType: 'BRITISH_IRISH',
      visaTypeLabel: 'British / Irish',
      documentStatus: 'SUBMITTED',
    });
    expect(res.body.data.checklist).toHaveLength(11);
    for (const item of res.body.data.checklist) {
      expect(item.document).toMatchObject({ reviewStatus: 'PENDING', rejectionReason: null });
    }
  });

  it('lists Pending documents first, keeping catalogue order within each group', async () => {
    const { profile } = await submittedCandidate();
    await DocumentModel.updateOne({ documentName: 'CV' }, { reviewStatus: ReviewStatus.APPROVED });
    await DocumentModel.updateOne(
      { documentName: 'Passport' },
      { reviewStatus: ReviewStatus.REJECTED, rejectionReason: 'Blurry' }
    );
    const { agent } = await loginAs(Role.ADMIN);

    const res = await agent.get(reviewUrl(profile!._id.toString()));
    const statuses = res.body.data.checklist.map((item: { key: string; document: { reviewStatus: string } }) => [
      item.key,
      item.document.reviewStatus,
    ]);

    expect(statuses.slice(0, 2)).toEqual([
      ['MandatoryPracticalTrainingCertificate', 'PENDING'],
      ['MedicationTrainingCertificate', 'PENDING'],
    ]);
    expect(statuses.slice(-2)).toEqual([
      ['CV', 'APPROVED'],
      ['Passport', 'REJECTED'],
    ]);
    expect(res.body.data.checklist.at(-1).document.rejectionReason).toBe('Blurry');
  });

  it('excludes files for Required Documents that do not apply to the Visa Type', async () => {
    const session = await candidateWithVisaType('STUDENT');
    await upload(session.agent, 'TermLetter');
    await session.agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'BRITISH_IRISH' });
    const { agent } = await loginAs(Role.ADMIN);

    const res = await agent.get(reviewUrl(session.profile!._id.toString()));

    expect(res.body.data.checklist.map((item: { key: string }) => item.key)).not.toContain('TermLetter');
  });

  describe('preview URLs for Candidate Documents', () => {
    it.each([Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE])('are available to %s', async (role) => {
      const { profile } = await submittedCandidate();
      const { agent } = await loginAs(role);
      const view = await agent.get(reviewUrl(profile!._id.toString()));

      const res = await agent.get(`/api/documents/${view.body.data.checklist[0].document._id}/download-url`);

      expect(res.status).toBe(200);
      expect(res.body.data.url).toEqual(expect.any(String));
    });

    it('are refused to a Candidate for another Candidate\'s document', async () => {
      const { profile } = await submittedCandidate();
      const { agent: reviewer } = await loginAs(Role.ADMIN);
      const view = await reviewer.get(reviewUrl(profile!._id.toString()));
      const { agent: otherCandidate } = await loginAs(Role.CANDIDATE, APPROVED);

      const res = await otherCandidate.get(`/api/documents/${view.body.data.checklist[0].document._id}/download-url`);

      expect(res.status).toBe(403);
    });
  });

  it('returns 404 for an unknown or malformed candidate id', async () => {
    const { agent } = await loginAs(Role.ADMIN);

    expect((await agent.get(reviewUrl('64b000000000000000000000'))).status).toBe(404);
    expect((await agent.get(reviewUrl('not-an-id'))).status).toBe(404);
  });

  it.each([Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE])('is open to %s', async (role) => {
    const { profile } = await submittedCandidate();
    const { agent } = await loginAs(role);

    expect((await agent.get(reviewUrl(profile!._id.toString()))).status).toBe(200);
  });

  it('is refused to Candidates, including for their own profile', async () => {
    const { agent, profile } = await loginAs(Role.CANDIDATE, APPROVED);

    expect((await agent.get(reviewUrl(profile!._id.toString()))).status).toBe(403);
  });
});

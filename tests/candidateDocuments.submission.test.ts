import dayjs from 'dayjs';
import { Role } from '../src/models/User.model';
import CandidateProfileModel, { DocumentStatus } from '../src/models/CandidateProfile.model';
import { loginAs } from './helpers/auth';
import { APPROVED, candidateWithVisaType, getChecklist, upload, uploadAllRequired } from './helpers/documents';

const SUBMIT = '/api/candidate-documents/me/submit';

describe('Document Submission', () => {
  it('refuses Submission while any applicable Required Document has no Upload', async () => {
    const { agent } = await candidateWithVisaType();
    await uploadAllRequired(agent, ['NationalInsurance']);

    const res = await agent.post(SUBMIT);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/National Insurance/);
    expect((await getChecklist(agent)).documentStatus).toBe('NOT_SUBMITTED');
  });

  it('refuses Submission before a Visa Type is chosen', async () => {
    const { agent } = await loginAs(Role.CANDIDATE, APPROVED);

    const res = await agent.post(SUBMIT);

    expect(res.status).toBe(400);
  });

  it('only counts Required Documents that apply to the current Visa Type', async () => {
    const { agent } = await candidateWithVisaType('STUDENT');
    await uploadAllRequired(agent, ['TermLetter', 'EnrolmentLetter']);
    await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'BRITISH_IRISH' });

    const res = await agent.post(SUBMIT);

    expect(res.status).toBe(200);
  });

  it('moves Document Status to Submitted and records when', async () => {
    const { agent, profile } = await candidateWithVisaType();
    await uploadAllRequired(agent);
    const before = dayjs().subtract(1, 'second');

    const res = await agent.post(SUBMIT);

    expect(res.status).toBe(200);
    expect(res.body.data.documentStatus).toBe('SUBMITTED');
    const saved = await CandidateProfileModel.findById(profile!._id);
    expect(saved?.documentStatus).toBe(DocumentStatus.SUBMITTED);
    expect(dayjs(saved?.documentsSubmittedAt).isAfter(before)).toBe(true);
  });

  it.each([DocumentStatus.SUBMITTED, DocumentStatus.APPROVED])('refuses Submission from %s', async (documentStatus) => {
    const { agent, profile } = await candidateWithVisaType();
    await uploadAllRequired(agent);
    await CandidateProfileModel.updateOne({ _id: profile!._id }, { documentStatus });

    const res = await agent.post(SUBMIT);

    expect(res.status).toBe(409);
  });

  it('accepts only one of two simultaneous Submissions', async () => {
    const { agent } = await candidateWithVisaType();
    await uploadAllRequired(agent);

    const statuses = (await Promise.all([agent.post(SUBMIT), agent.post(SUBMIT)])).map((res) => res.status);

    expect(statuses.sort()).toEqual([200, 409]);
  });

  it('refuses staff users', async () => {
    const { agent } = await loginAs(Role.CONSULTANT);

    const res = await agent.post(SUBMIT);

    expect(res.status).toBe(403);
  });

  describe('after Submission', () => {
    const submittedCandidate = async () => {
      const session = await candidateWithVisaType();
      await uploadAllRequired(session.agent);
      await session.agent.post(SUBMIT);
      return session;
    };

    it('refuses uploads', async () => {
      const { agent } = await submittedCandidate();

      const { presigned } = await upload(agent, 'Passport');

      expect(presigned.status).toBe(409);
    });

    it('refuses uploads once Approved', async () => {
      const { agent, profile } = await submittedCandidate();
      await CandidateProfileModel.updateOne({ _id: profile!._id }, { documentStatus: DocumentStatus.APPROVED });

      const { presigned } = await upload(agent, 'Passport');

      expect(presigned.status).toBe(409);
    });

    it('locks the Visa Type', async () => {
      const { agent } = await submittedCandidate();

      const res = await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'STUDENT' });

      expect(res.status).toBe(409);
      expect((await getChecklist(agent)).visaType).toBe('BRITISH_IRISH');
    });

    it('keeps the Visa Type locked when Changes Required', async () => {
      const { agent, profile } = await submittedCandidate();
      await CandidateProfileModel.updateOne(
        { _id: profile!._id },
        { documentStatus: DocumentStatus.CHANGES_REQUIRED }
      );

      const res = await agent.put('/api/candidate-documents/me/visa-type').send({ visaType: 'STUDENT' });

      expect(res.status).toBe(409);
    });
  });
});

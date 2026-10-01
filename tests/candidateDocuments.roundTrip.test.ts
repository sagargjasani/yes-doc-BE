import dayjs from 'dayjs';
import { Role } from '../src/models/User.model';
import CandidateProfileModel from '../src/models/CandidateProfile.model';
import { sendDocumentChangesRequiredEmail, sendDocumentsApprovedEmail } from '../src/utils/mailer';
import { loginAs } from './helpers/auth';
import { getChecklist, reviewDocuments as review, submittedCandidate, upload } from './helpers/documents';

const SUBMIT = '/api/candidate-documents/me/submit';

const changesRequiredCandidate = async () => {
  const candidate = await submittedCandidate();
  const reviewer = (await loginAs(Role.COMPLIANCE)).agent;
  const candidateId = candidate.profile!._id.toString();
  await review(reviewer, candidateId, { ProofOfAddress1: 'Older than three months', Passport: 'Cut off' });
  return { candidate: candidate.agent, email: candidate.profile!.email, reviewer, candidateId };
};

describe('Changes Required round trip', () => {
  it('lists Rejected documents first, with their Rejection Reasons', async () => {
    const { candidate } = await changesRequiredCandidate();

    const { documentStatus, checklist } = await getChecklist(candidate);

    expect(documentStatus).toBe('CHANGES_REQUIRED');
    expect(checklist.slice(0, 2).map((item) => [item.key, item.document?.reviewStatus, item.document?.rejectionReason])).toEqual([
      ['Passport', 'REJECTED', 'Cut off'],
      ['ProofOfAddress1', 'REJECTED', 'Older than three months'],
    ]);
    expect(checklist.slice(2).every((item) => item.document?.reviewStatus === 'APPROVED')).toBe(true);
  });

  it('refuses an upload over an Approved document', async () => {
    const { candidate } = await changesRequiredCandidate();

    const { presigned } = await upload(candidate, 'CV');

    expect(presigned.status).toBe(409);
  });

  it('accepts a re-upload of a Rejected document, putting it back to Pending', async () => {
    const { candidate } = await changesRequiredCandidate();

    const { confirm } = await upload(candidate, 'Passport', { filename: 'passport-clear.pdf' });

    expect(confirm?.status).toBe(201);
    const passport = (await getChecklist(candidate)).checklist.find((item) => item.key === 'Passport');
    expect(passport?.document).toMatchObject({ reviewStatus: 'PENDING', rejectionReason: null });
  });

  it('refuses resubmission while any document is still Rejected', async () => {
    const { candidate } = await changesRequiredCandidate();
    await upload(candidate, 'Passport');

    const res = await candidate.post(SUBMIT);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Proof of Address 1/);
    expect((await getChecklist(candidate)).documentStatus).toBe('CHANGES_REQUIRED');
  });

  it('runs the full round trip to Approved', async () => {
    const { candidate, email, reviewer, candidateId } = await changesRequiredCandidate();
    expect(sendDocumentChangesRequiredEmail).toHaveBeenCalledTimes(1);
    expect(sendDocumentChangesRequiredEmail).toHaveBeenCalledWith(email, expect.any(Array));
    const firstSubmittedAt = (await CandidateProfileModel.findById(candidateId))!.documentsSubmittedAt;

    // Approved documents are locked
    expect((await upload(candidate, 'CV')).presigned.status).toBe(409);

    // Re-upload only the rejected documents and resubmit
    await upload(candidate, 'Passport');
    await upload(candidate, 'ProofOfAddress1');
    const resubmit = await candidate.post(SUBMIT);
    expect(resubmit.status).toBe(200);
    expect(resubmit.body.data.documentStatus).toBe('SUBMITTED');
    const resubmittedAt = (await CandidateProfileModel.findById(candidateId))!.documentsSubmittedAt;
    expect(dayjs(resubmittedAt).isAfter(dayjs(firstSubmittedAt))).toBe(true);

    // Back on the Reviewer list; drawer shows the re-uploads Pending first, prior approvals still Approved
    const list = await reviewer.get('/api/candidate-documents/submitted');
    expect(list.body.data.map((row: { _id: string }) => row._id)).toEqual([candidateId]);
    const view = await reviewer.get(`/api/candidate-documents/${candidateId}`);
    const statuses = view.body.data.checklist.map(
      (item: { key: string; document: { reviewStatus: string } }) => [item.key, item.document.reviewStatus]
    );
    expect(statuses.slice(0, 2)).toEqual([
      ['Passport', 'PENDING'],
      ['ProofOfAddress1', 'PENDING'],
    ]);
    expect(statuses.slice(2).every(([, status]: [string, string]) => status === 'APPROVED')).toBe(true);

    // Approve everything
    const approved = await review(reviewer, candidateId);
    expect(approved.status).toBe(200);
    expect(approved.body.data.documentStatus).toBe('APPROVED');
    expect(sendDocumentsApprovedEmail).toHaveBeenCalledTimes(1);
    expect(sendDocumentsApprovedEmail).toHaveBeenCalledWith(email);
    expect((await getChecklist(candidate)).documentStatus).toBe('APPROVED');
    expect((await upload(candidate, 'Passport')).presigned.status).toBe(409);
  });

  it('lets a Reviewer change a previous approval on re-review', async () => {
    const { candidate, reviewer, candidateId } = await changesRequiredCandidate();
    await upload(candidate, 'Passport');
    await upload(candidate, 'ProofOfAddress1');
    await candidate.post(SUBMIT);

    const res = await review(reviewer, candidateId, { CV: 'Gaps now need explaining' });

    expect(res.body.data.documentStatus).toBe('CHANGES_REQUIRED');
    const cv = (await getChecklist(candidate)).checklist.find((item) => item.key === 'CV');
    expect(cv?.document).toMatchObject({ reviewStatus: 'REJECTED', rejectionReason: 'Gaps now need explaining' });
  });
});

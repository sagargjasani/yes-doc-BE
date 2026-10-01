import { Types } from 'mongoose';
import type TestAgent from 'supertest/lib/agent';
import { Role } from '../src/models/User.model';
import CandidateProfileModel from '../src/models/CandidateProfile.model';
import DocumentModel, { ReviewStatus } from '../src/models/Document.model';
import { sendDocumentChangesRequiredEmail, sendDocumentsApprovedEmail } from '../src/utils/mailer';
import { loginAs } from './helpers/auth';
import { APPROVED, candidateWithVisaType, submittedCandidate } from './helpers/documents';

interface Decision {
  documentId: string;
  status: string;
  rejectionReason?: string;
}

const reviewUrl = (candidateId: string) => `/api/candidate-documents/${candidateId}/review`;

/** The Reviewer's view of the Candidate's documents, keyed by Required Document key. */
const documentIdsByKey = async (reviewer: TestAgent, candidateId: string) => {
  const res = await reviewer.get(`/api/candidate-documents/${candidateId}`);
  return Object.fromEntries(
    res.body.data.checklist.map((item: { key: string; document: { _id: string } }) => [item.key, item.document._id])
  ) as Record<string, string>;
};

/** Approves everything except the keys given in `rejections` (key → Rejection Reason). */
const decide = async (reviewer: TestAgent, candidateId: string, rejections: Record<string, string> = {}) => {
  const ids = await documentIdsByKey(reviewer, candidateId);
  return Object.entries(ids).map(([key, documentId]): Decision =>
    key in rejections
      ? { documentId, status: 'REJECTED', rejectionReason: rejections[key] }
      : { documentId, status: 'APPROVED' }
  );
};

const setup = async () => {
  const candidate = await submittedCandidate();
  const reviewer = await loginAs(Role.CONSULTANT);
  return { candidate, reviewer: reviewer.agent, candidateId: candidate.profile!._id.toString() };
};

describe('Document Review', () => {
  it('approves everything: Document Status Approved, documents Approved, approved email', async () => {
    const { candidate, reviewer, candidateId } = await setup();

    const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions: await decide(reviewer, candidateId) });

    expect(res.status).toBe(200);
    expect(res.body.data.documentStatus).toBe('APPROVED');
    expect((await CandidateProfileModel.findById(candidateId))?.documentStatus).toBe('APPROVED');
    expect(await DocumentModel.countDocuments({ candidate: new Types.ObjectId(candidateId), reviewStatus: ReviewStatus.APPROVED })).toBe(11);
    expect(sendDocumentsApprovedEmail).toHaveBeenCalledWith(candidate.profile!.email);
    expect(sendDocumentChangesRequiredEmail).not.toHaveBeenCalled();
  });

  it('rejects some: Changes Required, reasons stored, email lists exactly the rejected documents', async () => {
    const { candidate, reviewer, candidateId } = await setup();
    const decisions = await decide(reviewer, candidateId, {
      ProofOfAddress2: 'Older than three months',
      Passport: 'Photo page is cut off',
    });

    const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions });

    expect(res.status).toBe(200);
    expect(res.body.data.documentStatus).toBe('CHANGES_REQUIRED');
    const passport = await DocumentModel.findOne({ candidate: new Types.ObjectId(candidateId), documentName: 'Passport' });
    expect(passport).toMatchObject({ reviewStatus: 'REJECTED', rejectionReason: 'Photo page is cut off' });
    expect(await DocumentModel.countDocuments({ candidate: new Types.ObjectId(candidateId), reviewStatus: ReviewStatus.APPROVED })).toBe(9);
    // Catalogue order, not the order decisions were sent in
    expect(sendDocumentChangesRequiredEmail).toHaveBeenCalledWith(candidate.profile!.email, [
      { label: 'Passport', rejectionReason: 'Photo page is cut off' },
      { label: 'Proof of Address 2', rejectionReason: 'Older than three months' },
    ]);
    expect(sendDocumentsApprovedEmail).not.toHaveBeenCalled();
  });

  it('removes the Candidate from the Reviewer list', async () => {
    const { reviewer, candidateId } = await setup();

    await reviewer.post(reviewUrl(candidateId)).send({ decisions: await decide(reviewer, candidateId) });

    const list = await reviewer.get('/api/candidate-documents/submitted');
    expect(list.body.data).toEqual([]);
  });

  describe('refuses an incomplete or invalid review (400) and changes nothing', () => {
    const expectUnchanged = async (candidateId: string) => {
      expect((await CandidateProfileModel.findById(candidateId))?.documentStatus).toBe('SUBMITTED');
      expect(await DocumentModel.countDocuments({ candidate: new Types.ObjectId(candidateId), reviewStatus: { $ne: ReviewStatus.PENDING } })).toBe(0);
      expect(sendDocumentsApprovedEmail).not.toHaveBeenCalled();
      expect(sendDocumentChangesRequiredEmail).not.toHaveBeenCalled();
    };

    it('when a Candidate Document has no decision', async () => {
      const { reviewer, candidateId } = await setup();
      const decisions = (await decide(reviewer, candidateId)).slice(1);

      const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions });

      expect(res.status).toBe(400);
      await expectUnchanged(candidateId);
    });

    it.each([undefined, '', '   '])('when a rejection has Rejection Reason %p', async (rejectionReason) => {
      const { reviewer, candidateId } = await setup();
      const decisions = await decide(reviewer, candidateId);
      decisions[0] = { documentId: decisions[0].documentId, status: 'REJECTED', rejectionReason };

      const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions });

      expect(res.status).toBe(400);
      await expectUnchanged(candidateId);
    });

    it('when a decision has an unknown status', async () => {
      const { reviewer, candidateId } = await setup();
      const decisions = await decide(reviewer, candidateId);
      decisions[0].status = 'PENDING';

      const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions });

      expect(res.status).toBe(400);
      await expectUnchanged(candidateId);
    });

    it('when a document has two decisions', async () => {
      const { reviewer, candidateId } = await setup();
      const decisions = await decide(reviewer, candidateId);
      decisions.push({ documentId: decisions[0].documentId, status: 'REJECTED', rejectionReason: 'Changed my mind' });

      const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions });

      expect(res.status).toBe(400);
      await expectUnchanged(candidateId);
    });

    it('when a decision is for another Candidate\'s document', async () => {
      const { reviewer, candidateId } = await setup();
      const other = await submittedCandidate();
      const decisions = await decide(reviewer, candidateId);
      const [otherDocumentId] = Object.values(await documentIdsByKey(reviewer, other.profile!._id.toString()));
      decisions[0] = { documentId: otherDocumentId, status: 'APPROVED' };

      const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions });

      expect(res.status).toBe(400);
      await expectUnchanged(candidateId);
    });
  });

  describe('only while the Document Status is Submitted (409)', () => {
    it('refuses a second review', async () => {
      const { reviewer, candidateId } = await setup();
      const decisions = await decide(reviewer, candidateId);
      await reviewer.post(reviewUrl(candidateId)).send({ decisions });
      const secondReviewer = (await loginAs(Role.ADMIN)).agent;

      const res = await secondReviewer.post(reviewUrl(candidateId)).send({ decisions });

      expect(res.status).toBe(409);
    });

    it('accepts only one of two simultaneous reviews', async () => {
      const { reviewer, candidateId } = await setup();
      const approveAll = await decide(reviewer, candidateId);
      const rejectOne = await decide(reviewer, candidateId, { CV: 'Gaps not explained' });
      const secondReviewer = (await loginAs(Role.COMPLIANCE)).agent;

      const statuses = (
        await Promise.all([
          reviewer.post(reviewUrl(candidateId)).send({ decisions: approveAll }),
          secondReviewer.post(reviewUrl(candidateId)).send({ decisions: rejectOne }),
        ])
      ).map((res) => res.status);

      expect(statuses.sort()).toEqual([200, 409]);
      const emailsSent =
        (sendDocumentsApprovedEmail as jest.Mock).mock.calls.length +
        (sendDocumentChangesRequiredEmail as jest.Mock).mock.calls.length;
      expect(emailsSent).toBe(1);
    });

    it('refuses a Candidate who has not submitted', async () => {
      const { profile } = await candidateWithVisaType();
      const reviewer = (await loginAs(Role.ADMIN)).agent;

      const res = await reviewer.post(reviewUrl(profile!._id.toString())).send({ decisions: [] });

      expect(res.status).toBe(409);
    });
  });

  it('leaves the Candidate Submitted, and sends no email, if saving the decisions fails', async () => {
    const { reviewer, candidateId } = await setup();
    const decisions = await decide(reviewer, candidateId, { CV: 'Gaps not explained' });
    const bulkWrite = jest.spyOn(DocumentModel, 'bulkWrite').mockRejectedValueOnce(new Error('write failed'));

    const res = await reviewer.post(reviewUrl(candidateId)).send({ decisions });
    bulkWrite.mockRestore();

    expect(res.status).toBe(500);
    expect((await CandidateProfileModel.findById(candidateId))?.documentStatus).toBe('SUBMITTED');
    expect(sendDocumentChangesRequiredEmail).not.toHaveBeenCalled();
    // and the review can be retried
    const retry = await reviewer.post(reviewUrl(candidateId)).send({ decisions });
    expect(retry.status).toBe(200);
  });

  it('returns 404 for an unknown Candidate', async () => {
    const reviewer = (await loginAs(Role.ADMIN)).agent;

    const res = await reviewer.post(reviewUrl('64b000000000000000000000')).send({ decisions: [] });

    expect(res.status).toBe(404);
  });

  it('is refused to Candidates', async () => {
    const { candidateId } = await setup();
    const { agent } = await loginAs(Role.CANDIDATE, APPROVED);

    const res = await agent.post(reviewUrl(candidateId)).send({ decisions: [] });

    expect(res.status).toBe(403);
  });
});

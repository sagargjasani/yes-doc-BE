import dayjs from 'dayjs';
import { Role } from '../src/models/User.model';
import { DocumentStatus } from '../src/models/CandidateProfile.model';
import { loginAs } from './helpers/auth';
import { APPROVED } from './helpers/documents';

const LIST = '/api/candidate-documents/submitted';

const candidateWith = (documentStatus: DocumentStatus, submittedDaysAgo?: number) =>
  loginAs(Role.CANDIDATE, {
    ...APPROVED,
    documentStatus,
    appliedFor: 'Support Worker',
    ...(submittedDaysAgo !== undefined && {
      documentsSubmittedAt: dayjs().subtract(submittedDaysAgo, 'day').toDate(),
    }),
  });

describe('Reviewer list of Document Submissions', () => {
  it('lists only Candidates whose Document Status is Submitted, oldest Submission first', async () => {
    const newer = await candidateWith(DocumentStatus.SUBMITTED, 1);
    const older = await candidateWith(DocumentStatus.SUBMITTED, 3);
    await candidateWith(DocumentStatus.NOT_SUBMITTED);
    await candidateWith(DocumentStatus.CHANGES_REQUIRED, 2);
    await candidateWith(DocumentStatus.APPROVED, 2);
    const { agent } = await loginAs(Role.ADMIN);

    const res = await agent.get(LIST);

    expect(res.status).toBe(200);
    expect(res.body.data.map((row: { _id: string }) => row._id)).toEqual([
      older.profile!._id.toString(),
      newer.profile!._id.toString(),
    ]);
  });

  it('returns basic Candidate details and the submitted date', async () => {
    const { profile } = await candidateWith(DocumentStatus.SUBMITTED, 1);
    const { agent } = await loginAs(Role.ADMIN);

    const res = await agent.get(LIST);

    expect(res.body.data[0]).toEqual({
      _id: profile!._id.toString(),
      firstName: profile!.firstName,
      lastName: profile!.lastName,
      email: profile!.email,
      mobile: profile!.mobile,
      appliedFor: 'Support Worker',
      documentsSubmittedAt: profile!.documentsSubmittedAt!.toISOString(),
    });
  });

  describe('pagination', () => {
    const threeSubmitted = async () => {
      const ids = [];
      for (const daysAgo of [3, 2, 1]) {
        ids.push((await candidateWith(DocumentStatus.SUBMITTED, daysAgo)).profile!._id.toString());
      }
      return ids;
    };

    it('pages through Candidates oldest Submission first', async () => {
      const [oldest, middle, newest] = await threeSubmitted();
      const { agent } = await loginAs(Role.ADMIN);

      const first = await agent.get(`${LIST}?page=1&limit=2`);
      const second = await agent.get(`${LIST}?page=2&limit=2`);

      expect(first.body.data.map((row: { _id: string }) => row._id)).toEqual([oldest, middle]);
      expect(first.body.pagination).toEqual({ total: 3, page: 1, limit: 2, totalPages: 2, hasNextPage: true });
      expect(second.body.data.map((row: { _id: string }) => row._id)).toEqual([newest]);
      expect(second.body.pagination).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2, hasNextPage: false });
    });

    it('defaults to page 1 of 10 for missing or invalid values', async () => {
      await threeSubmitted();
      const { agent } = await loginAs(Role.ADMIN);

      for (const query of ['', '?page=abc&limit=xyz', '?page=0&limit=-5']) {
        const res = await agent.get(`${LIST}${query}`);
        expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, total: 3, totalPages: 1 });
        expect(res.body.data).toHaveLength(3);
      }
    });

    it('caps the page size at 100', async () => {
      const { agent } = await loginAs(Role.ADMIN);

      const res = await agent.get(`${LIST}?limit=5000`);

      expect(res.body.pagination.limit).toBe(100);
    });
  });

  it.each([Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE])('is open to %s', async (role) => {
    const { agent } = await loginAs(role);

    const res = await agent.get(LIST);

    expect(res.status).toBe(200);
  });

  it('is refused to Candidates', async () => {
    const { agent } = await loginAs(Role.CANDIDATE, APPROVED);

    const res = await agent.get(LIST);

    expect(res.status).toBe(403);
  });
});

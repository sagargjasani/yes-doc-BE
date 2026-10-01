import request from 'supertest';
import UserModel, { Role } from '../src/models/User.model';
import { loginAs } from './helpers/auth';
import { getTestServer } from './helpers/server';
import { sendEmail } from '../src/emails/send';
import { generatePresignedGetUrl, deleteS3File, getCandidateS3Key } from '../src/services/s3.service';

describe('test harness', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(getTestServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs in as a Candidate with a Candidate profile', async () => {
    const { agent, user, profile } = await loginAs(Role.CANDIDATE, {
      applicationStatus: 'APPLICATION_FORM_APPROVED',
    });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(Role.CANDIDATE);
    expect(res.body.data.user.email).toBe(user.email);
    expect(profile?.applicationStatus).toBe('APPLICATION_FORM_APPROVED');
  });

  it.each([Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE])('logs in as a Reviewer (%s)', async (role) => {
    const { agent, profile } = await loginAs(role);

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(role);
    expect(profile).toBeNull();
  });

  describe('data isolation', () => {
    it('writes data in one test', async () => {
      await loginAs(Role.ADMIN);
      expect(await UserModel.countDocuments()).toBe(1);
    });

    it('does not see it in the next', async () => {
      expect(await UserModel.countDocuments()).toBe(0);
    });
  });

  it('mocks email sending and S3 so no real traffic happens', async () => {
    expect(jest.isMockFunction(sendEmail)).toBe(true);
    expect(await generatePresignedGetUrl('any-key')).toBe('https://s3.test/download');
    expect(jest.isMockFunction(deleteS3File)).toBe(true);
    expect(jest.isMockFunction(getCandidateS3Key)).toBe(false);
  });
});

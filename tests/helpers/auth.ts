import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../src/app';
import UserModel, { Role } from '../../src/models/User.model';
import CandidateProfileModel, { CandidateProfile } from '../../src/models/CandidateProfile.model';
import { hashPassword } from '../../src/utils/password';

const PASSWORD = 'Password123!';

/**
 * Creates an active user of `role` and returns a supertest agent logged in as them.
 * Candidates also get a CandidateProfile; `profileOverrides` sets fields on it (e.g. applicationStatus).
 */
export const loginAs = async (role: Role, profileOverrides: Partial<CandidateProfile> = {}) => {
  const id = randomUUID().slice(0, 8);
  const email = `${role}-${id}@example.com`;
  const mobile = `07${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`;

  const user = await UserModel.create({
    firstName: 'Test',
    lastName: role,
    email,
    mobile,
    password: await hashPassword(PASSWORD),
    role,
  });

  const profile =
    role === Role.CANDIDATE
      ? await CandidateProfileModel.create({
          user: user._id,
          firstName: 'Test',
          lastName: 'Candidate',
          email,
          mobile,
          ...profileOverrides,
        })
      : null;

  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) {
    throw new Error(`loginAs(${role}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { agent, user, profile };
};

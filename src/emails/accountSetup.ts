import { Role } from '../models/User.model';
import { appUrl } from './links';
import { sendEmail } from './send';

/** Invites a new user to set their password: staff get a role-specific email, a Candidate the Candidate one. */
export const sendAccountSetupEmail = (user: { email: string; firstName: string; role: Role }, resetToken: string) => {
  const setPasswordUrl = appUrl(`/create-password/${resetToken}`);
  return user.role === Role.CANDIDATE
    ? sendEmail('candidateInvite', { to: user.email, props: { firstName: user.firstName, setPasswordUrl } })
    : sendEmail('staffInvite', { to: user.email, props: { firstName: user.firstName, role: user.role, setPasswordUrl } });
};

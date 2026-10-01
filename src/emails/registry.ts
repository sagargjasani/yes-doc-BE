import type { ComponentType } from 'react';
import ApplicationApproved, * as applicationApproved from './templates/ApplicationApproved';
import ApplicationChangesRequired, * as applicationChangesRequired from './templates/ApplicationChangesRequired';
import CandidateInvite, * as candidateInvite from './templates/CandidateInvite';
import DocumentChangesRequired, * as documentChangesRequired from './templates/DocumentChangesRequired';
import DocumentsApproved, * as documentsApproved from './templates/DocumentsApproved';
import PasswordReset, * as passwordReset from './templates/PasswordReset';
import ReferenceRequest, * as referenceRequest from './templates/ReferenceRequest';
import ReferenceResubmission, * as referenceResubmission from './templates/ReferenceResubmission';
import StaffInvite, * as staffInvite from './templates/StaffInvite';

interface EmailTemplate<P> {
  component: ComponentType<P> & { PreviewProps?: P };
  subject: (props: P) => string;
}

const template = <P>(component: EmailTemplate<P>['component'], subject: (props: P) => string): EmailTemplate<P> => ({
  component,
  subject,
});

/** Every email the system sends. Add a template file, then register it here. */
export const emailTemplates = {
  candidateInvite: template(CandidateInvite, candidateInvite.subject),
  staffInvite: template(StaffInvite, staffInvite.subject),
  passwordReset: template(PasswordReset, passwordReset.subject),
  applicationApproved: template(ApplicationApproved, applicationApproved.subject),
  applicationChangesRequired: template(ApplicationChangesRequired, applicationChangesRequired.subject),
  documentsApproved: template(DocumentsApproved, documentsApproved.subject),
  documentChangesRequired: template(DocumentChangesRequired, documentChangesRequired.subject),
  referenceRequest: template(ReferenceRequest, referenceRequest.subject),
  referenceResubmission: template(ReferenceResubmission, referenceResubmission.subject),
};

export type EmailTemplates = typeof emailTemplates;
export type EmailTemplateName = keyof EmailTemplates;
export type EmailProps<T extends EmailTemplateName> = EmailTemplates[T] extends EmailTemplate<infer P> ? P : never;

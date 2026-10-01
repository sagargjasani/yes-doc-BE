import { createElement, type ComponentType } from 'react';
import { render } from 'react-email';
import { env } from '../config/env';
import { EmailAssetsContext } from './components/assets';
import { emailTemplates, type EmailProps, type EmailTemplateName } from './registry';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const renderEmail = async <T extends EmailTemplateName>(name: T, props: EmailProps<T>): Promise<RenderedEmail> => {
  const { component, subject } = emailTemplates[name] as unknown as {
    component: ComponentType<EmailProps<T>>;
    subject: (props: EmailProps<T>) => string;
  };
  const element = createElement(
    EmailAssetsContext.Provider,
    { value: env.EMAIL_ASSET_BASE_URL },
    createElement(component as ComponentType<object>, props as object)
  );

  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: subject(props), html, text };
};

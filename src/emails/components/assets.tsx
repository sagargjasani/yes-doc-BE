import { createContext, useContext } from 'react';

// renderEmail provides the configured asset host; the React Email preview server
// renders without a provider and serves the same files from /static.
export const EmailAssetsContext = createContext('/static');

export const useAssetUrl = (file: string) => `${useContext(EmailAssetsContext).replace(/\/$/, '')}/${file}`;

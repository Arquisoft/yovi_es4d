// src/config.ts
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');

const defaultApiUrl = globalThis.window === undefined
  ? ''
  : globalThis.window.location.origin;

function wouldCauseMixedContent(configured: string) {
  if (globalThis.window === undefined) return false;

  const pageProtocol = globalThis.window.location.protocol;
  return pageProtocol === 'https:' && configured.startsWith('http://');
}

export const API_URL =
  configuredApiUrl && !wouldCauseMixedContent(configuredApiUrl)
    ? configuredApiUrl
    : defaultApiUrl;

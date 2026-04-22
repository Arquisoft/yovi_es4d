// src/config.ts
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');

const defaultApiUrl = typeof globalThis.window === 'undefined'
  ? ''
  : globalThis.window.location.origin;

export const API_URL = configuredApiUrl || defaultApiUrl;

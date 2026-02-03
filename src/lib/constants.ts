/**
 * Application-wide constants and configuration values
 */

// Time constants (in seconds unless specified)
export const TIME = {
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_DAY: 86400,
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
} as const;

// File size constants (in bytes)
export const FILE_SIZE = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
} as const;

// Upload progress milestones
export const UPLOAD_PROGRESS = {
  INITIATED: 10,
  URL_RECEIVED: 20,
  UPLOADING: 30,
  COMPLETE: 100,
} as const;

// Filename display limits
export const FILENAME_MAX_LENGTH = {
  FILE_LIST: 60,
  UPLOAD_DIALOG: 50,
  DEFAULT: 30,
  MAX_EXTENSION_LENGTH: 10,
} as const;

// Custom link validation
export const CUSTOM_LINK = {
  MIN_LENGTH: 6,
  REGEX: /^[a-zA-Z0-9]{6,}$/,
  ERROR_MESSAGES: {
    TOO_SHORT: 'Custom link must be at least 6 characters',
    INVALID_FORMAT: 'Only alphanumeric characters allowed',
    COLLISION: 'This link is already taken',
  },
} as const;

// API endpoints - Direct AWS service calls (no Next.js API routes)
export const API_ENDPOINTS = {
  // Direct Lambda URL for file uploads
  UPLOAD_URL: process.env.NEXT_PUBLIC_DATA_AUTH_LAMBDA_URL || '',
  // Direct Cognito OAuth endpoint for token exchange
  AUTH_EXCHANGE: `https://${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/token`,
} as const;

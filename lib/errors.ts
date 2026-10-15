import { randomBytes } from 'node:crypto';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'STALE_VERSION'
  | 'BLOCKED'
  | 'LIMIT_REACHED'
  | 'RATE_LIMITED'
  | 'SUSPENDED'
  | 'UPSTREAM'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  STALE_VERSION: 409,
  BLOCKED: 422,
  LIMIT_REACHED: 429,
  RATE_LIMITED: 429,
  SUSPENDED: 403,
  UPSTREAM: 502,
  INTERNAL: 500,
};

/** An expected, user-presentable failure. `details` may list blocking reasons. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: string[],
  ) {
    super(message);
    this.name = 'AppError';
  }
  get status() {
    return STATUS[this.code];
  }
}

export const newErrorRef = () => 'ERR-' + randomBytes(4).toString('hex').toUpperCase();

export const notFound = (what = 'Record') => new AppError('NOT_FOUND', `${what} not found.`);
export const forbidden = (msg = 'You do not have permission to do that.') => new AppError('FORBIDDEN', msg);

export const securityConfig = {
  helmetEnabled: true,
  rateLimitingEnabled: true,
  secureCookies: process.env.NODE_ENV === 'production',
  jwtEnabled: true,
  auditLoggingEnabled: true,
  databaseEnabled: true,
  mfaEnabled: true,
};

export const securityThresholds = {
  failedLoginAttempts: 5,
  rapidAttendanceWindowMs: 5 * 60 * 1000,
  requestBurstWindowMs: 5 * 60 * 1000,
  requestBurstThreshold: 120,
};

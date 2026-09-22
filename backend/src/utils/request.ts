import { Request } from 'express';

const browserMatchers = [
  { label: 'Edge', pattern: /Edg\//i },
  { label: 'Chrome', pattern: /Chrome\//i },
  { label: 'Firefox', pattern: /Firefox\//i },
  { label: 'Safari', pattern: /Safari\//i },
];

export const getClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  const rawIp = forwardedIp || req.socket.remoteAddress || req.ip || 'unknown';
  return rawIp.replace(/^::ffff:/, '').trim();
};

export const getUserAgent = (req: Request) => req.headers['user-agent'] || 'Unknown Agent';

export const getBrowserName = (userAgent: string) => {
  const matcher = browserMatchers.find(({ pattern }) => pattern.test(userAgent));
  return matcher?.label || 'Unknown Browser';
};

export const getDeviceName = (userAgent: string) => {
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/Android/i.test(userAgent)) return 'Android Device';
  if (/Windows/i.test(userAgent)) return 'Windows Device';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'Mac Device';
  if (/Linux/i.test(userAgent)) return 'Linux Device';
  return 'Unknown Device';
};

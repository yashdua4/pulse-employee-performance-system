import { NextFunction, Request, Response } from 'express';
import { SuspiciousSeverity } from '@prisma/client';
import { createSuspiciousActivity } from '../utils/security.js';
import { getClientIp } from '../utils/request.js';
import { securityThresholds } from '../config/security.js';

const requestCounters = new Map<
  string,
  {
    count: number;
    firstSeenAt: number;
    lastAlertAt?: number;
  }
>();

export const trackRequestVolume = async (req: Request, _res: Response, next: NextFunction) => {
  const actorId = req.user?.id || getClientIp(req);
  const now = Date.now();
  const current = requestCounters.get(actorId);

  if (!current || now - current.firstSeenAt > securityThresholds.requestBurstWindowMs) {
    requestCounters.set(actorId, { count: 1, firstSeenAt: now });
    return next();
  }

  current.count += 1;

  const shouldAlert =
    current.count > securityThresholds.requestBurstThreshold &&
    (!current.lastAlertAt || now - current.lastAlertAt > securityThresholds.requestBurstWindowMs);

  if (shouldAlert) {
    current.lastAlertAt = now;
    await createSuspiciousActivity({
      userId: req.user?.id,
      type: 'EXCESSIVE_API_REQUESTS',
      description: 'High API request volume detected within a short period.',
      severity: SuspiciousSeverity.HIGH,
      metadata: {
        count: current.count,
        path: req.originalUrl,
      },
      req,
    });
  }

  requestCounters.set(actorId, current);
  next();
};

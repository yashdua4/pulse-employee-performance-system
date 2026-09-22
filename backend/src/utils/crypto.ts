import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const baseSecret =
  process.env.MFA_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'pulse_default_mfa_encryption_secret_2026';

const encryptionKey = createHash('sha256').update(baseSecret).digest();

export const encryptText = (value: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptText = (value: string) => {
  const [ivHex, authTagHex, encryptedHex] = value.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Malformed encrypted value');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

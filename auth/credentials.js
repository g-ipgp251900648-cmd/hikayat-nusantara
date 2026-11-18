import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const SETTINGS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const validLoginId = id => typeof id === 'string' && /^[A-Z0-9-]{5,32}$/.test(id);
export const validPassword = value => typeof value === 'string' && value.length >= 12 && value.length <= 128;
export const validName = name => typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;
export const temporaryPassword = () => randomBytes(18).toString('base64url');
export const uniqueId = role => 'HN-' + ({ teacher: 'G', student: 'M' }[role] || 'U') + '-' + randomBytes(6).toString('hex').toUpperCase();
export const sessionToken = () => randomBytes(32).toString('base64url');
export const tokenHash = token => createHash('sha256').update(token).digest('hex');

export async function hashPassword(password) {
  if (!validPassword(password)) throw Error('Password does not meet length policy');
  const salt = randomBytes(16);
  const digest = await scrypt(password, salt, 64, SETTINGS);
  return 'scrypt$32768$8$1$' + salt.toString('base64url') + '$' + digest.toString('base64url');
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 128 || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts[1] !== '32768' ||
      parts[2] !== '8' || parts[3] !== '1') return false;
  try {
    const salt=Buffer.from(parts[4],'base64url'), expected=Buffer.from(parts[5],'base64url');
    if(salt.length !== 16 || expected.length !== 64)return false;
    const actual=await scrypt(password,salt,64,SETTINGS);
    return timingSafeEqual(actual,expected);
  } catch { return false; }
}

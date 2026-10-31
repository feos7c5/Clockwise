const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;

export const toB64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));

export const newSecret = () => toB64url(globalThis.crypto.getRandomValues(new Uint8Array(32)));

export async function deriveKeys(secret) {
  const base = await subtle().importKey('raw', fromB64url(secret), 'HKDF', false, ['deriveBits', 'deriveKey']);
  const params = info => ({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('clockwise-v1'), info: enc.encode(info) });
  const token = toB64url(new Uint8Array(await subtle().deriveBits(params('auth'), base, 256)));
  const key = await subtle().deriveKey(params('data'), base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { token, key };
}

export async function seal(key, value) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return `${toB64url(iv)}.${toB64url(new Uint8Array(data))}`;
}

export async function unseal(key, blob) {
  const [iv, data] = blob.split('.');
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromB64url(iv) }, key, fromB64url(data));
  return JSON.parse(dec.decode(plain));
}

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function newPairCode() {
  let code = '';
  while (code.length < 8) {
    for (const b of globalThis.crypto.getRandomValues(new Uint8Array(16))) {
      if (b < 248 && code.length < 8) code += ALPHABET[b % ALPHABET.length];
    }
  }
  return code;
}

export const formatPairCode = code => `${code.slice(0, 4)}-${code.slice(4)}`;

export function normalizePairCode(input) {
  const code = String(input).toUpperCase().replace(/[\s-]/g, '');
  return code.length === 8 && [...code].every(c => ALPHABET.includes(c)) ? code : null;
}

export async function pairKeys(code) {
  const hash = await subtle().digest('SHA-256', enc.encode(`clockwise-pair-lookup:${code}`));
  const lookup = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  const base = await subtle().importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('clockwise-pair-v1'), iterations: 600_000 },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
  return { lookup, key };
}

const RECOVERY_PREFIX = 'CW1-';
export const toRecoveryKey = secret => RECOVERY_PREFIX + secret;

export function parseRecoveryKey(input) {
  const s = String(input).trim().replace(/\s/g, '');
  if (!s.startsWith(RECOVERY_PREFIX)) return null;
  const secret = s.slice(RECOVERY_PREFIX.length);
  return /^[A-Za-z0-9_-]{43}$/.test(secret) ? secret : null;
}

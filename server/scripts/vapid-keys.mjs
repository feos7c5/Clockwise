import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
console.log(`VAPID_PUBLIC_KEY  = "${publicKey.export({ format: 'der', type: 'spki' }).subarray(-65).toString('base64url')}"   → wrangler.toml [vars]`);
console.log(`VAPID_PRIVATE_KEY = ${privateKey.export({ format: 'jwk' }).d}   → npx wrangler secret put VAPID_PRIVATE_KEY`);

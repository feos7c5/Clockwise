const utf8 = new TextEncoder();
const EC = { name: 'ECDH', namedCurve: 'P-256' };

export const b64url = {
  encode(buf) {
    let s = '';
    for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(str) {
    return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  },
};

const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
};

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

// RFC 8291 (aes128gcm) – a single record carrying the whole payload.
export async function encrypt(payload, p256dh, auth, { salt = crypto.getRandomValues(new Uint8Array(16)), local } = {}) {
  const uaPublic = b64url.decode(p256dh);
  local ||= await crypto.subtle.generateKey(EC, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, EC, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(b64url.decode(auth), shared, concat(utf8.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, utf8.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8.encode('Content-Encoding: nonce\0'), 12);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(utf8.encode(payload), new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

// RFC 8292 – VAPID. VAPID_PUBLIC_KEY is the raw uncompressed key, VAPID_PRIVATE_KEY its scalar "d", both base64url.
export async function vapid(endpoint, env) {
  const pub = b64url.decode(env.VAPID_PUBLIC_KEY);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64url.encode(pub.slice(1, 33)), y: b64url.encode(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const part = obj => b64url.encode(utf8.encode(JSON.stringify(obj)));
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8.encode(unsigned));
  return `vapid t=${unsigned}.${b64url.encode(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

export async function sendPush(sub, message, env) {
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapid(sub.endpoint, env),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'high',
    },
    body: await encrypt(JSON.stringify(message), sub.p256dh, sub.auth),
  });
  return res.status;
}

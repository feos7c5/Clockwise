// Adresse des Sync-Servers. Lokal: `npm run dev` im Ordner server/.
const LOCAL = 'http://localhost:8787';
const PRODUCTION = ''; // wird nach dem ersten Deploy eingetragen

export const SYNC_URL = ['localhost', '127.0.0.1'].includes(location.hostname) ? LOCAL : PRODUCTION;
export const SYNC_AVAILABLE = Boolean(SYNC_URL);

const LOCAL = 'http://localhost:8787';
const PRODUCTION = 'https://clockwise-sync.clockwise-sync.workers.dev';

export const SYNC_URL = ['localhost', '127.0.0.1'].includes(location.hostname) ? LOCAL : PRODUCTION;
export const SYNC_AVAILABLE = Boolean(SYNC_URL);

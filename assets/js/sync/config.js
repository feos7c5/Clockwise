const LOCAL = 'http://localhost:8787';
const PRODUCTION = 'https://clockwise-sync.clockwise-sync.workers.dev';

export const SYNC_URL = ['localhost', '127.0.0.1'].includes(location.hostname) ? LOCAL : PRODUCTION;
export const SYNC_AVAILABLE = Boolean(SYNC_URL);

// Public VAPID key of the server (server/wrangler.toml), needed synchronously when subscribing on iOS.
export const VAPID_KEY = 'BKJpYyb0LUhUqemyKZ7h4RgOjimuvTsYPvLFVi8DRkuuvP7V1w9gK-Pktj5K0GXg2j8V-BwEsTa7YfR6iCXaxcM';

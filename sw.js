const CACHE = 'clockwise-v23';

const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/css/tokens.css', 'assets/css/base.css', 'assets/css/components.css',
  'assets/css/layout.css', 'assets/css/views.css', 'assets/css/themes.css',
  'assets/js/main.js',
  'assets/js/i18n/index.js', 'assets/js/i18n/de.js', 'assets/js/i18n/en.js',
  'assets/js/sync/api.js', 'assets/js/sync/config.js', 'assets/js/sync/crypto.js', 'assets/js/sync/engine.js', 'assets/js/sync/merge.js',
  'assets/js/views/cloud-dialogs.js', 'assets/js/views/settings/cloud.js',
  'assets/js/core/calc.js', 'assets/js/core/codes.js', 'assets/js/core/defaults.js', 'assets/js/core/file-sync.js',
  'assets/js/core/holidays.js', 'assets/js/core/session.js', 'assets/js/core/store.js', 'assets/js/core/time.js',
  'assets/js/ui/dialog.js', 'assets/js/ui/dom.js', 'assets/js/ui/icons.js', 'assets/js/ui/nav.js', 'assets/js/ui/theme.js',
  'assets/js/views/today.js', 'assets/js/views/month.js', 'assets/js/views/year.js',
  'assets/js/views/day-dialog.js', 'assets/js/views/absence-dialog.js',
  'assets/js/views/settings/index.js', 'assets/js/views/settings/general.js',
  'assets/js/views/settings/worktime.js', 'assets/js/views/settings/data.js',
  'assets/js/features/export.js', 'assets/js/features/pdf.js', 'assets/js/features/report.js', 'assets/js/features/install.js', 'assets/js/features/update.js', 'assets/js/views/install-notice.js', 'assets/js/ui/notice.js', 'assets/js/features/reminders.js',
  'assets/icons/logo.svg', 'assets/icons/icon-180.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return clients.openWindow('./');
    }),
  );
});

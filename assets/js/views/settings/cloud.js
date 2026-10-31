import { SYNC_AVAILABLE } from '../../sync/config.js';
import { syncEnabled, syncState, enableSync, listDevices, removeDevice, syncFingerprint } from '../../sync/engine.js';
import { hhmm } from '../../core/session.js';
import { t, language } from '../../i18n/index.js';
import { parseISO } from '../../core/time.js';
import { $, $$, esc, cardHead } from '../../ui/dom.js';
import { ICON } from '../../ui/icons.js';
import { rerender } from '../../ui/nav.js';
import { openPairDialog, openJoinDialog, openRecoveryDialog, openDisableDialog, openRenameDialog } from '../cloud-dialogs.js';

function lastSeen(seen) {
  if (!seen) return '';
  const days = Math.round((parseISO(seen) - parseISO(new Date().toISOString().slice(0, 10))) / 86_400_000);
  return new Intl.RelativeTimeFormat(language(), { numeric: 'auto' }).format(days, 'day');
}

function deviceList() {
  const devices = listDevices();
  if (!devices.length) return '';
  return `<div class="card-head sub"><h2>${t('cloud.devices')}</h2><span class="muted fingerprint">${t('cloud.fingerprint', { id: syncFingerprint() })}</span></div>
    <ul class="devices">${devices.map(d => `<li>
      <div class="device-info">
        <div class="device-name">${esc(d.name)}${d.self ? ` <span class="muted">· ${t('cloud.thisDevice')}</span>` : ''}</div>
        <div class="hint flush">${t('cloud.lastSeen', { when: lastSeen(d.seen) })}</div>
      </div>
      <div class="btn-group">
        <button class="btn btn-icon btn-sm btn-ghost" data-rename="${d.id}" aria-label="${t('cloud.rename')}">${ICON.edit}</button>
        ${d.self ? '' : `<button class="btn btn-sm btn-ghost danger" data-remove="${d.id}">${t('cloud.remove')}</button>`}
      </div></li>`).join('')}</ul>
    <p class="hint">${t('cloud.fingerprintHint')}</p>`;
}

function statusLine() {
  const { status, last, error } = syncState;
  const text = {
    syncing: t('cloud.statusSyncing'),
    ok: last ? t('cloud.statusOkAt', { time: hhmm(last) }) : t('cloud.statusOk'),
    offline: t('cloud.statusOffline'),
    error: `${t('cloud.statusError')}${error ? ` (${esc(error)})` : ''}`,
  }[status] || t('cloud.statusSyncing');
  const dot = { ok: 'on', syncing: 'brk', error: 'err' }[status] || '';
  return `<div class="status"><span class="dot ${dot}"></span>${text}</div>`;
}

export const cloud = {
  html: () => {
    if (!SYNC_AVAILABLE) return '';
    if (!syncEnabled()) {
      return `<section class="card">${cardHead(t('cloud.title'))}
        <p class="hint flush">${t('cloud.intro')}</p>
        <div class="btn-row section-actions">
          <button class="btn btn-primary" id="syncOn">${t('cloud.enable')}</button>
          <button class="btn" id="syncJoin">${t('cloud.join')}</button></div></section>`;
    }
    return `<section class="card">
      ${cardHead(t('cloud.title'), `<button class="btn btn-sm btn-ghost danger" id="syncOff">${t('cloud.disable')}</button>`)}
      ${statusLine()}
      <button class="btn btn-primary btn-block section-actions" id="syncPair">${ICON.plus}${t('cloud.addDevice')}</button>
      <button class="btn btn-block section-actions" id="syncRecovery">${t('cloud.recovery')}</button>
      ${deviceList()}</section>`;
  },
  bind: view => {
    $('#syncOn', view)?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      await enableSync();
      rerender();
    });
    $('#syncJoin', view)?.addEventListener('click', openJoinDialog);
    $('#syncPair', view)?.addEventListener('click', openPairDialog);
    $('#syncRecovery', view)?.addEventListener('click', openRecoveryDialog);
    $('#syncOff', view)?.addEventListener('click', openDisableDialog);
    $$('[data-rename]', view).forEach(b => (b.onclick = () => openRenameDialog(b.dataset.rename)));
    $$('[data-remove]', view).forEach(b => (b.onclick = () => {
      const device = listDevices().find(d => d.id === b.dataset.remove);
      if (device && confirm(t('cloud.confirmRemove', { name: device.name }))) { removeDevice(device.id); rerender(); }
    }));
  },
};

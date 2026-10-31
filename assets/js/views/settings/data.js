// Einstellungen: Speicherort, Backup, Export, Zurücksetzen.
import { resetState } from '../../core/store.js';
import { canFileSync, sync, connectFile, reconnectFile, disconnectFile } from '../../core/file-sync.js';
import { now, hhmm } from '../../core/session.js';
import { t } from '../../i18n/index.js';
import { $, esc, cardHead } from '../../ui/dom.js';
import { applyTheme } from '../../ui/theme.js';
import { rerender } from '../../ui/nav.js';
import { saveBackup, loadBackup, exportCSV } from '../../features/export.js';

function syncBlock() {
  if (!canFileSync) return `<p class="hint flush">${t('settings.syncUnsupported')}</p>`;
  if (!sync.handle) {
    return `<p class="hint flush">${t('settings.syncIntro')}</p>
      <div class="btn-row section-actions"><button class="btn btn-primary" id="fsNew">${t('settings.syncNew')}</button>
      <button class="btn" id="fsOpen">${t('settings.syncOpen')}</button></div>`;
  }
  const status = sync.perm === 'granted'
    ? (sync.last ? t('settings.syncSavedAt', { time: hhmm(sync.last) }) : t('settings.syncConnected'))
    : t('settings.syncNeedsPermission');
  return `<div class="switch"><div><div class="strong">${esc(sync.handle.name)}</div>
      <div class="hint flush">${status}${sync.error ? ' · ' + esc(sync.error) : ''}</div></div>
    <div class="btn-group">${sync.perm !== 'granted' ? `<button class="btn btn-sm btn-primary" id="fsRe">${t('settings.syncAllow')}</button>` : ''}
      <button class="btn btn-sm" id="fsOff">${t('settings.syncDisconnect')}</button></div></div>`;
}

export const storage = {
  html: () => `<section class="card">${cardHead(t('settings.storage'))}
    ${syncBlock()}
    <div class="btn-row section-actions"><button class="btn" id="backup">${t('settings.backupSave')}</button>
      <button class="btn" id="restore">${t('settings.backupLoad')}</button></div>
    <button class="btn btn-block section-actions" id="csv">${t('settings.exportCsv')}</button>
    <input type="file" id="restoreFile" accept="application/json,.json" hidden>
    <p class="hint">${t('settings.privacy')}</p></section>`,
  bind: view => {
    $('#fsNew', view)?.addEventListener('click', () => connectFile(false));
    $('#fsOpen', view)?.addEventListener('click', () => connectFile(true));
    $('#fsRe', view)?.addEventListener('click', reconnectFile);
    $('#fsOff', view)?.addEventListener('click', disconnectFile);
    $('#backup', view).onclick = saveBackup;
    $('#restore', view).onclick = () => $('#restoreFile', view).click();
    $('#restoreFile', view).onchange = async e => { if (await loadBackup(e.target.files[0])) { applyTheme(); rerender(); } };
    $('#csv', view).onclick = () => exportCSV(now().getFullYear());
  },
};

export const reset = {
  html: () => `<section class="card">${cardHead(t('settings.reset'))}
    <button class="btn btn-block btn-ghost danger filled" id="reset">${t('settings.resetButton')}</button>
    <p class="hint">${t('settings.resetHint')}</p></section>`,
  bind: view => {
    $('#reset', view).onclick = () => {
      if (!confirm(t('settings.confirmReset'))) return;
      resetState(); applyTheme(); rerender();
    };
  },
};

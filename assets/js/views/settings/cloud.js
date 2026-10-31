import { SYNC_AVAILABLE } from '../../sync/config.js';
import { syncEnabled, syncState, enableSync } from '../../sync/engine.js';
import { hhmm } from '../../core/session.js';
import { t } from '../../i18n/index.js';
import { $, esc, cardHead } from '../../ui/dom.js';
import { ICON } from '../../ui/icons.js';
import { rerender } from '../../ui/nav.js';
import { openPairDialog, openJoinDialog, openRecoveryDialog, openDisableDialog } from '../cloud-dialogs.js';

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
      <button class="btn btn-block section-actions" id="syncRecovery">${t('cloud.recovery')}</button></section>`;
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
  },
};

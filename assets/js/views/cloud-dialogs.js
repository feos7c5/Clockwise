import { pad } from '../core/time.js';
import { createPairCode, joinSync, recoveryKey, disableSync, listDevices, renameDevice } from '../sync/engine.js';
import { t } from '../i18n/index.js';
import { $, esc } from '../ui/dom.js';
import { showDialog, dialogHead, closeDialog } from '../ui/dialog.js';
import { rerender } from '../ui/nav.js';
import { shareOrDownload } from '../features/export.js';

const PAIR_TTL_S = 10 * 60;

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = t('cloud.copied');
    setTimeout(() => { button.textContent = t('cloud.copy'); }, 2000);
  } catch { }
}

export function openPairDialog() {
  let timer;
  const show = async () => {
    showDialog(`${dialogHead(t('cloud.pairTitle'))}
      <p class="hint flush">${t('cloud.pairHint')}</p>
      <div class="pair-code" id="pairCode">${t('cloud.creating')}</div>
      <div class="pair-meta" id="pairMeta"></div>
      <div class="dlg-foot"><span class="spacer"></span>
        <button type="button" class="btn" id="pairCopy" disabled>${t('cloud.copy')}</button>
        <button type="button" class="btn btn-primary" data-close>OK</button></div>`, dlg => {
      dlg.addEventListener('close', () => clearInterval(timer), { once: true });
    });
    const dlg = $('#dialog');
    try {
      const code = await createPairCode();
      $('#pairCode', dlg).textContent = code;
      const copy = $('#pairCopy', dlg);
      copy.disabled = false;
      copy.onclick = () => copyText(code, copy);
      const until = Date.now() + PAIR_TTL_S * 1000;
      const tick = () => {
        const left = Math.max(0, Math.round((until - Date.now()) / 1000));
        $('#pairMeta', dlg).textContent = left ? t('cloud.validFor', { time: `${Math.floor(left / 60)}:${pad(left % 60)}` }) : t('cloud.expired');
        if (!left) {
          clearInterval(timer);
          $('#pairCode', dlg).classList.add('expired');
          copy.textContent = t('cloud.newCode');
          copy.onclick = show;
        }
      };
      tick();
      timer = setInterval(tick, 1000);
    } catch {
      $('#pairCode', dlg).textContent = '—';
      $('#pairMeta', dlg).textContent = t('cloud.errNetwork');
    }
  };
  show();
}

const joinError = e => (e.message === 'invalid_code' ? t('cloud.errInvalid') : e.message === 'unknown_code' ? t('cloud.errUnknown') : t('cloud.errNetwork'));

export function openJoinDialog() {
  const canPaste = Boolean(navigator.clipboard?.readText);
  showDialog(`${dialogHead(t('cloud.joinTitle'))}
    <p class="hint flush">${t('cloud.joinHint')}</p>
    <label class="field dlg-section"><span>${t('cloud.codeLabel')}</span>
      <div class="input-action">
        <input type="text" id="joinCode" placeholder="${t('cloud.codePlaceholder')}" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text">
        ${canPaste ? `<button type="button" class="btn btn-sm" id="joinPaste">${t('cloud.paste')}</button>` : ''}
      </div></label>
    <div class="warn" id="joinError" hidden></div>
    <p class="hint">${t('cloud.joinRecoveryHint')}</p>
    <div class="dlg-foot"><span class="spacer"></span>
      <button type="button" class="btn" data-close>${t('common.cancel')}</button>
      <button type="button" class="btn btn-primary" id="joinOk">${t('cloud.connect')}</button></div>`, dlg => {
    const input = $('#joinCode', dlg), ok = $('#joinOk', dlg), error = $('#joinError', dlg);
    const submit = async () => {
      ok.disabled = true; ok.textContent = t('cloud.connecting'); error.hidden = true;
      try {
        await joinSync(input.value);
        closeDialog(); rerender();
      } catch (e) {
        error.textContent = joinError(e); error.hidden = false;
        ok.disabled = false; ok.textContent = t('cloud.connect');
      }
    };
    ok.onclick = submit;
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
    $('#joinPaste', dlg)?.addEventListener('click', async () => {
      try { input.value = (await navigator.clipboard.readText()).trim(); input.focus(); } catch { }
    });
    setTimeout(() => input.focus(), 50);
  });
}

export function openRecoveryDialog() {
  const key = recoveryKey();
  showDialog(`${dialogHead(t('cloud.recoveryTitle'))}
    <p class="hint flush">${t('cloud.recoveryHint')}</p>
    <div class="recovery-key">${key}</div>
    <div class="dlg-foot"><span class="spacer"></span>
      <button type="button" class="btn" id="recCopy">${t('cloud.copy')}</button>
      <button type="button" class="btn btn-primary" id="recSave">${t('cloud.saveFile')}</button></div>`, dlg => {
    $('#recCopy', dlg).onclick = e => copyText(key, e.currentTarget);
    $('#recSave', dlg).onclick = () => shareOrDownload(t('cloud.recoveryFile'), t('cloud.recoveryFileText', { key }), 'text/plain');
  });
}

export function openDisableDialog() {
  showDialog(`${dialogHead(t('cloud.disableTitle'))}
    <p class="hint flush">${t('cloud.disableHint')}</p>
    <div class="dlg-foot stacked">
      <button type="button" class="btn btn-primary" id="disDevice">${t('cloud.disableDevice')}</button>
      <button type="button" class="btn btn-ghost danger" id="disAll">${t('cloud.disableAll')}</button></div>`, dlg => {
    $('#disDevice', dlg).onclick = async () => { await disableSync(); closeDialog(); rerender(); };
    $('#disAll', dlg).onclick = async () => {
      if (!confirm(t('cloud.confirmWipe'))) return;
      try { await disableSync({ wipe: true }); } catch { alert(t('cloud.errNetwork')); return; }
      closeDialog(); rerender();
    };
  });
}

export function openRenameDialog(id) {
  const device = listDevices().find(d => d.id === id);
  if (!device) return;
  showDialog(`${dialogHead(t('cloud.renameTitle'))}
    <label class="field"><span>${t('cloud.deviceName')}</span><input type="text" id="devName" maxlength="40" value="${esc(device.name)}" autofocus></label>
    <div class="dlg-foot"><span class="spacer"></span>
      <button type="button" class="btn" data-close>${t('common.cancel')}</button>
      <button type="button" class="btn btn-primary" id="devSave">${t('common.save')}</button></div>`, dlg => {
    const save = () => { renameDevice(id, $('#devName', dlg).value); closeDialog(); rerender(); };
    $('#devSave', dlg).onclick = save;
    $('#devName', dlg).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); save(); } };
  });
}

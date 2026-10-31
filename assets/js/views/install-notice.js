// Hinweis „Als App installieren“ auf der Heute-Seite.
import { installMode, dismissInstall, promptInstall } from '../features/install.js';
import { t } from '../i18n/index.js';
import { $ } from '../ui/dom.js';
import { ICON } from '../ui/icons.js';

export function installNotice() {
  const mode = installMode();
  if (!mode) return '';
  const action = mode === 'prompt' ? `<button class="btn btn-sm btn-primary" id="installApp">${t('install.action')}</button>` : '';
  return `<div class="notice info">
    <div><b>${t('install.title')}</b>${t(`install.${mode}`)}</div>
    <div class="notice-actions">${action}
      <button class="btn btn-icon btn-sm btn-ghost" id="installDismiss" aria-label="${t('install.dismiss')}">${ICON.close}</button></div>
  </div>`;
}

export function bindInstallNotice(view) {
  $('#installApp', view)?.addEventListener('click', promptInstall);
  $('#installDismiss', view)?.addEventListener('click', dismissInstall);
}

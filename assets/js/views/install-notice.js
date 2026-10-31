import { installMode, promptInstall } from '../features/install.js';
import { t } from '../i18n/index.js';
import { $ } from '../ui/dom.js';
import { notice } from '../ui/notice.js';

export function installNotice() {
  const mode = installMode();
  if (!mode) return '';
  const action = mode === 'prompt' ? `<button class="btn btn-sm btn-primary" id="installApp">${t('install.action')}</button>` : '';
  return notice({ id: 'install', title: t('install.title'), text: t(`install.${mode}`), action });
}

export function bindInstallNotice(view) {
  $('#installApp', view)?.addEventListener('click', promptInstall);
}

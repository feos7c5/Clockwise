// Zusammenführen zweier Datenstände Tag für Tag.
// Jede Änderung bekommt einen Zeitstempel (meta.days / meta.settings), die neuere gewinnt.
// Gelöschte Tage behalten ihren Zeitstempel und werden so auf allen Geräten gelöscht.

// Bleiben pro Gerät und werden nicht abgeglichen
export const DEVICE_SETTINGS = ['theme', 'language', 'remind'];

export const sharedSettings = settings =>
  Object.fromEntries(Object.entries(settings).filter(([k]) => !DEVICE_SETTINGS.includes(k)));

const emptyMeta = () => ({ days: {}, settings: 0 });

// Stabile Serialisierung (Schlüssel sortiert) für Vergleiche
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function snapshot(state) {
  const days = {};
  for (const [ds, day] of Object.entries(state.days)) days[ds] = canonical(day);
  return { days, settings: canonical(sharedSettings(state.settings)) };
}

// Vergleicht mit dem letzten Stand und stempelt geänderte Tage/Einstellungen
export function stamp(state, previous, now = Date.now()) {
  const meta = (state.meta ||= emptyMeta());
  const current = snapshot(state);
  for (const ds of new Set([...Object.keys(previous.days), ...Object.keys(current.days)])) {
    if (previous.days[ds] !== current.days[ds]) meta.days[ds] = now;
  }
  if (previous.settings !== current.settings) meta.settings = now;
  return current;
}

// Was auf den Server geht: ohne gerätelokale Einstellungen
export const payload = state => ({
  version: 1,
  days: state.days,
  settings: sharedSettings(state.settings),
  meta: state.meta || emptyMeta(),
});

// Bei Gleichstand gewinnt der Server-Stand; fehlt er dort, bleibt der lokale Tag erhalten
export function merge(local, remote) {
  const lm = local.meta || emptyMeta(), rm = remote.meta || emptyMeta();
  const days = {}, metaDays = {};
  const all = new Set([...Object.keys(local.days), ...Object.keys(remote.days), ...Object.keys(lm.days), ...Object.keys(rm.days)]);

  for (const ds of all) {
    const lt = lm.days[ds] ?? 0, rt = rm.days[ds] ?? 0;
    const winner = lt > rt ? local : rt > lt ? remote : (ds in remote.days ? remote : local);
    if (ds in winner.days) days[ds] = structuredClone(winner.days[ds]);
    if (Math.max(lt, rt) > 0) metaDays[ds] = Math.max(lt, rt);
  }

  const settingsFromLocal = (lm.settings || 0) > (rm.settings || 0);
  const shared = settingsFromLocal ? sharedSettings(local.settings) : sharedSettings(remote.settings);
  const deviceOnly = Object.fromEntries(DEVICE_SETTINGS.filter(k => k in local.settings).map(k => [k, local.settings[k]]));

  return {
    ...local,
    days,
    settings: structuredClone({ ...local.settings, ...shared, ...deviceOnly }),
    meta: { days: metaDays, settings: Math.max(lm.settings || 0, rm.settings || 0) },
  };
}

// js/ui.js
// Small DOM helpers: toasts, loading screen progress, settings panel wiring.

export function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function runLoadingSequence(onDone) {
  const fill = document.getElementById('loading-bar-fill');
  const status = document.getElementById('loading-status');
  const steps = [
    { pct: 20, msg: 'Gathering arcane energies…' },
    { pct: 45, msg: 'Calibrating gesture runes…' },
    { pct: 70, msg: 'Summoning particle spirits…' },
    { pct: 92, msg: 'Opening the portal…' },
    { pct: 100, msg: 'Welcome, Wielder.' },
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) { onDone(); return; }
    fill.style.width = `${steps[i].pct}%`;
    status.textContent = steps[i].msg;
    i++;
    setTimeout(tick, 420);
  };
  tick();
}

export function fadeOutElement(el, after) {
  el.style.transition = 'opacity .7s ease';
  el.style.opacity = '0';
  setTimeout(() => { el.classList.add('hidden'); after?.(); }, 700);
}

/**
 * Wires the settings panel controls to a callbacks object.
 * @param {Object} callbacks { onQuality, onSensitivity, onVolume, onMirror, onSkeleton }
 */
export function bindSettingsPanel(callbacks) {
  const panel = document.getElementById('settings-panel');
  document.getElementById('btn-settings').addEventListener('click', () => panel.classList.toggle('hidden'));
  document.getElementById('btn-close-settings').addEventListener('click', () => panel.classList.add('hidden'));

  document.getElementById('setting-quality').addEventListener('change', (e) => callbacks.onQuality?.(e.target.value));
  document.getElementById('setting-sensitivity').addEventListener('input', (e) => callbacks.onSensitivity?.(parseFloat(e.target.value)));
  document.getElementById('setting-volume').addEventListener('input', (e) => callbacks.onVolume?.(parseFloat(e.target.value)));
  document.getElementById('setting-mirror').addEventListener('change', (e) => callbacks.onMirror?.(e.target.checked));
  document.getElementById('setting-skeleton').addEventListener('change', (e) => callbacks.onSkeleton?.(e.target.checked));
}

export function bindThemeToggle() {
  const btn = document.getElementById('btn-theme');
  let light = false;
  btn.addEventListener('click', () => {
    light = !light;
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    btn.textContent = light ? '☀️' : '🌙';
  });
}

export function bindCameraToggle(camPreviewEl) {
  document.getElementById('btn-camera-toggle').addEventListener('click', () => {
    camPreviewEl.classList.toggle('hidden');
  });
}

export function updateGestureReadout(icon, name) {
  document.getElementById('gesture-icon').textContent = icon;
  document.getElementById('gesture-name').textContent = name;
}

export function updateHud(fps, confidencePct) {
  document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
  document.getElementById('confidence-counter').textContent =
    confidencePct == null ? 'Hand: --' : `Hand: ${confidencePct}%`;
}

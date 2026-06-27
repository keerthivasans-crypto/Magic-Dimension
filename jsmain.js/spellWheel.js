// js/spellWheel.js
// Builds and manages the radial spell-element wheel shown on the "two fingers" gesture.

const ELEMENTS = [
  { id: 'fire', icon: '🔥', label: 'Fire' },
  { id: 'ice', icon: '❄️', label: 'Ice' },
  { id: 'lightning', icon: '⚡', label: 'Lightning' },
  { id: 'wind', icon: '🌪️', label: 'Wind' },
  { id: 'nature', icon: '🌿', label: 'Nature' },
  { id: 'shadow', icon: '🌑', label: 'Shadow' },
  { id: 'galaxy', icon: '🌌', label: 'Galaxy' },
  { id: 'rainbow', icon: '🌈', label: 'Rainbow' },
  { id: 'neon', icon: '💠', label: 'Neon' },
];

export class SpellWheel {
  constructor(containerEl, onSelect) {
    this.el = containerEl;
    this.onSelect = onSelect;
    this.items = [];
    this.activeIndex = -1;
    this._build();
  }

  _build() {
    const radius = 110;
    ELEMENTS.forEach((el, i) => {
      const angle = (i / ELEMENTS.length) * Math.PI * 2 - Math.PI / 2;
      const x = 140 + radius * Math.cos(angle) - 32;
      const y = 140 + radius * Math.sin(angle) - 32;
      const btn = document.createElement('div');
      btn.className = 'spell-wheel__item';
      btn.style.left = `${x}px`;
      btn.style.top = `${y}px`;
      btn.innerHTML = `<span>${el.icon}</span>${el.label}`;
      this.el.appendChild(btn);
      this.items.push({ ...el, node: btn, angle });
    });
  }

  show() { this.el.classList.remove('hidden'); }
  hide() {
    this.el.classList.add('hidden');
    this.items.forEach((it) => it.node.classList.remove('active'));
    this.activeIndex = -1;
  }

  /**
   * Update hover highlight based on normalized fingertip position relative to wheel center.
   * @param {number} dx normalized -1..1 offset from wheel center (x)
   * @param {number} dy normalized -1..1 offset from wheel center (y)
   */
  updatePointer(dx, dy) {
    const dist = Math.hypot(dx, dy);
    if (dist < 0.12) { this._setActive(-1); return; }
    const angle = Math.atan2(dy, dx);
    let best = -1, bestDiff = Infinity;
    this.items.forEach((it, i) => {
      let diff = Math.abs(it.angle - angle);
      diff = Math.min(diff, Math.PI * 2 - diff);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    this._setActive(best);
  }

  _setActive(index) {
    if (index === this.activeIndex) return;
    this.items.forEach((it) => it.node.classList.remove('active'));
    this.activeIndex = index;
    if (index >= 0) {
      this.items[index].node.classList.add('active');
      this.onSelect?.(this.items[index].id, this.items[index].label, true);
    } else {
      this.onSelect?.(null, null, false);
    }
  }

  getActiveElement() {
    return this.activeIndex >= 0 ? this.items[this.activeIndex].id : null;
  }
}

export { ELEMENTS };

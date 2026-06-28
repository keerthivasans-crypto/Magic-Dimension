// js/main.js
// Application entry point. Wires together hand tracking, gesture recognition,
// the Three.js scene, sound, and UI panels.

import { HandTracker } from './handTracker.js';
import { recognizeGesture, GestureStabilizer } from './gestureRecognizer.js';
import { SceneEngine } from './sceneEngine.js';
import { SoundEngine } from './soundEngine.js';
import { SpellWheel } from './spellWheel.js';
import SpellEngine from './spellEngine.js';
import {
  showToast, runLoadingSequence, fadeOutElement,
  bindSettingsPanel, bindThemeToggle, bindCameraToggle,
  updateGestureReadout, updateHud,
} from './ui.js';

const GESTURE_DISPLAY = {
  open_palm: { icon: '✋', name: 'Open Palm — Energy Ball' },
  fist: { icon: '👊', name: 'Fist — Charging…' },
  one_finger: { icon: '☝️', name: 'One Finger — Drawing' },
  two_fingers: { icon: '✌️', name: 'Two Fingers — Spell Wheel' },
  three_fingers: { icon: '🤟', name: 'Three Fingers — Illusion Mode' },
  four_fingers: { icon: '🤙', name: 'Four Fingers — Summon' },
  thumb_up: { icon: '👍', name: 'Power Up' },
  thumb_down: { icon: '👎', name: 'Power Down' },
  heart: { icon: '❤️', name: 'Heart of Magic' },
  unknown: { icon: '🪄', name: 'Awaiting gesture…' },
};

const TRAIL_COLORS = [0x4fd1ff, 0xff6a3d, 0xffd27a, 0x9b5cff, 0x6fdc8c];

class App {
  constructor() {
    this.power = 1;
    this.fistHoldStart = null;
    this.fistTriggered = false;
    this.trailColorIdx = 0;

    this.stabilizers = [new GestureStabilizer(4), new GestureStabilizer(4)];
    this.sound = new SoundEngine();

    this._cacheDom();
    this._bindPermissionGate();
  }

  _cacheDom() {
    this.loadingScreen = document.getElementById('loading-screen');
    this.permissionGate = document.getElementById('permission-gate');
    this.appRoot = document.getElementById('app');
    this.video = document.getElementById('webcam-video');
    this.skeletonCanvas = document.getElementById('skeleton-canvas');
    this.sceneCanvas = document.getElementById('scene-canvas');
    this.spellWheelEl = document.getElementById('spell-wheel');
  }

  _bindPermissionGate() {
    runLoadingSequence(() => {
      fadeOutElement(this.loadingScreen, () => {
        this.permissionGate.classList.remove('hidden');
      });
    });

    document.getElementById('btn-grant-camera').addEventListener('click', () => this._requestCameraAndStart());
    document.getElementById('btn-skip-camera').addEventListener('click', () => this._startWithoutCamera());
  }

  async _requestCameraAndStart() {
    const errEl = document.getElementById('permission-error');
    errEl.classList.add('hidden');
    try {
      this.permissionGate.classList.add('hidden');
      this.appRoot.classList.remove('hidden');
      this._initScene();
      this.handTracker = new HandTracker(this.video, this.skeletonCanvas, (r) => this._onHandResults(r));
      await this.handTracker.start();
      showToast('✨ Camera connected — show me a gesture!');
    } catch (err) {
      console.error('Camera error:', err);
      this.appRoot.classList.add('hidden');
      this.permissionGate.classList.remove('hidden');
      errEl.textContent = 'Could not access your camera. Check browser permissions and try again, or continue in demo mode.';
      errEl.classList.remove('hidden');
    }
  }

  _startWithoutCamera() {
    this.permissionGate.classList.add('hidden');
    this.appRoot.classList.remove('hidden');
    this._initScene();
    document.getElementById('cam-preview').classList.add('hidden');
    showToast('Demo mode: no camera — ambient magic only. Reload to enable gestures.');
  }

  _initScene() {
    this.scene = new SceneEngine(this.sceneCanvas, document.getElementById('setting-quality').value);
    this.scene.start();
    this.spellWheel = new SpellWheel(this.spellWheelEl, (id, label, hovering) => {
      if (hovering) this.sound.spellWheel();
    });
    this.spellEngine = new SpellEngine(this.scene, this.sound);

    bindSettingsPanel({
      onQuality: (q) => this.scene.setQuality(q),
      onSensitivity: (v) => { this.gestureSensitivity = v; },
      onVolume: (v) => this.sound.setVolume(v),
      onMirror: (v) => this.handTracker?.setMirror(v),
      onSkeleton: (v) => this.handTracker?.setShowSkeleton(v),
    });
    bindThemeToggle();
    bindCameraToggle(document.getElementById('cam-preview'));
  }

  _onHandResults({ hands, fps }) {
    const avgConfidence = hands.length ? 92 : null;
    updateHud(fps, avgConfidence);

    if (hands.length === 0) {
      updateGestureReadout('🪄', 'No hand detected');
      this.spellWheel.hide();
      this.scene.closePortal();
      this.fistHoldStart = null;
      this.fistTriggered = false;
      this._portalOpen = false;
      this._portalHoldStart = null;
      return;
    }

    if (hands.length >= 2) {
      this._handleBothHands();
      return;
    }

    const landmarks = hands[0];
    const result = recognizeGesture(landmarks);
    const stab = this.stabilizers[0].push(result.name);
    const display = GESTURE_DISPLAY[result.name] || GESTURE_DISPLAY.unknown;
    updateGestureReadout(display.icon, display.name);

    const indexTip = landmarks[8];
    const palmCenter = landmarks[9];

    switch (result.name) {
      case 'open_palm':
        this._onOpenPalm(palmCenter);
        this.fistHoldStart = null;
        this._trackPortalHold(palmCenter);
        break;
      case 'fist':
        this._onFist(palmCenter);
        this._closeNonRelevant();
        break;
      case 'one_finger':
        this._onOneFinger(indexTip);
        this._resetHolds();
        break;
      case 'two_fingers':
        this._onTwoFingers(indexTip);
        this.fistHoldStart = null;
        this.scene.closePortal();
        this._portalOpen = false;
        break;
      case 'four_fingers':
        if (stab.changed) showToast('🐉 Summon gesture detected — creature library coming soon');
        this._closeNonRelevant();
        this._resetHolds();
        break;
      case 'three_fingers':
        if (stab.changed) showToast('🌀 Illusion mode — pick an illusion from the library');
        this._closeNonRelevant();
        this._resetHolds();
        break;
      case 'thumb_up':
        if (stab.changed) { this.power = Math.min(this.power + 0.3, 3); this.sound.power(true); showToast(`Power increased ×${this.power.toFixed(1)}`); }
        this._closeNonRelevant();
        this._resetHolds();
        break;
      case 'thumb_down':
        if (stab.changed) { this.power = Math.max(this.power - 0.3, 0.4); this.sound.power(false); showToast(`Power decreased ×${this.power.toFixed(1)}`); }
        this._closeNonRelevant();
        this._resetHolds();
        break;
      case 'heart':
        if (stab.changed) { this.scene.spawnHeart(palmCenter.x, palmCenter.y); this.sound.heart(); }
        this._closeNonRelevant();
        this._resetHolds();
        break;
      default:
        this._closeNonRelevant();
        this._resetHolds();
    }
  }

  _resetHolds() {
    this._portalHoldStart = null;
    this.scene.closePortal();
    this._portalOpen = false;
  }

  _onOpenPalm(pos) {
    if (!this._lastEnergyBallTime || performance.now() - this._lastEnergyBallTime > 250) {
      this.scene.spawnEnergyBall(pos.x, pos.y, this.power);
      this.sound.energyBall();
      this._lastEnergyBallTime = performance.now();
    }
  }

  _trackPortalHold(pos) {
    if (!this._portalHoldStart) this._portalHoldStart = performance.now();
    if (performance.now() - this._portalHoldStart > 1500 && !this._portalOpen) {
      this.scene.spawnPortal(pos.x, pos.y);
      this.sound.portal();
      this._portalOpen = true;
      showToast('🌌 Portal opened — hold open palm to keep it stable');
    }
  }

  _onFist(pos) {
    if (!this.fistHoldStart) this.fistHoldStart = performance.now();
    const held = performance.now() - this.fistHoldStart;
    if (held > 3000 && !this.fistTriggered) {
      this.scene.spawnFireBlast(pos.x, pos.y, this.power);
      this.sound.fireBlast();
      this.fistTriggered = true;
      showToast('🔥 Fire explosion unleashed!');
    } else if (!this.fistTriggered) {
      updateGestureReadout('👊', `Charging… ${Math.min(100, Math.round((held / 3000) * 100))}%`);
    }
  }

  _onOneFinger(tip) {
    const now = performance.now();
    if (!this._lastTrailTime || now - this._lastTrailTime > 40) {
      const color = TRAIL_COLORS[this.trailColorIdx % TRAIL_COLORS.length];
      this.scene.addTrailPoint(tip.x, tip.y, color);
      this.sound.trail();
      this._lastTrailTime = now;
    }
  }

  _onTwoFingers(tip) {
    this.spellWheel.show();
    const dx = (tip.x - 0.5) * 2;
    const dy = (tip.y - 0.5) * 2;
    this.spellWheel.updatePointer(dx, dy);

    const now = performance.now();
    if (!this._lastWheelCast || now - this._lastWheelCast > 1200) {
      const el = this.spellWheel.getActiveElement();
      if (el) {
        if (!this._wheelHoverStart) this._wheelHoverStart = now;
        if (now - this._wheelHoverStart > 700) {
          const SPELL_CAST_BY_ELEMENT = {
            fire: () => this.spellEngine.castFireSpell(),
            ice: () => this.spellEngine.castIceSpell(),
            lightning: () => this.spellEngine.castLightningSpell(),
            wind: () => this.spellEngine.castWindSpell(),
            nature: () => this.spellEngine.castNatureSpell(),
            shadow: () => this.spellEngine.castShadowSpell(),
            galaxy: () => this.spellEngine.castGalaxySpell(),
            rainbow: () => this.spellEngine.castRainbowSpell(),
            neon: () => this.spellEngine.castNeonSpell(),
          };
          SPELL_CAST_BY_ELEMENT[el]?.();
          showToast(`✨ ${el.charAt(0).toUpperCase()+el.slice(1)} spell cast!`);
          this._lastWheelCast = now;
          this._wheelHoverStart = null;
        }
      } else {
        this._wheelHoverStart = null;
      }
    }
  }

  _handleBothHands() {
    updateGestureReadout('🙌', 'ULTIMATE MAGIC MODE');
    const now = performance.now();
    if (!this._lastUltimate || now - this._lastUltimate > 2000) {
      this.scene.spawnUltimate();
      this.sound.ultimate();
      this._lastUltimate = now;
      showToast('🌩️ ULTIMATE MAGIC MODE ACTIVATED');
    }
    this.spellWheel.hide();
  }

  _closeNonRelevant() {
    this.spellWheel.hide();
    this._wheelHoverStart = null;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

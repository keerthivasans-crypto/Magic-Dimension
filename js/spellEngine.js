// js/spellEngine.js
//
// Standalone spell-casting module. Does NOT modify main.js, sceneEngine.js,
// soundEngine.js, or spellWheel.js — it only calls public methods already
// exposed on the SceneEngine and SoundEngine instances you pass in.
//
// Usage (from main.js, with zero changes required to existing files):
//
//   import SpellEngine from './spellEngine.js';
//   const spellEngine = new SpellEngine(this.scene, this.sound);
//   spellEngine.castFireSpell();
//
// Each cast* method:
//   1. Spawns the element's particle burst via sceneEngine.spawnElementBurst()
//      (this is the existing method already used by the spell wheel).
//   2. Plays the matching sound via soundEngine.elementChoose().
//   3. Triggers a camera shake via sceneEngine's existing shake helper.
//   4. Triggers an extra delayed "glow" burst at lower intensity, layered
//      on top of the main burst, for a brighter flash-then-fade feel.
//   5. Triggers a secondary particle animation pass shortly after the
//      first, to make the cast feel like more than a single pop.
//
// Position defaults to screen center (x=0.5, y=0.5) and power defaults to 1.
// Pass custom coordinates/power if you want a spell to originate from the
// caster's hand position instead (e.g. spellEngine.castFireSpell(palm.x, palm.y, power)).

const SHAKE_BY_ELEMENT = {
  fire:      { intensity: 0.3, duration: 0.4 },
  ice:       { intensity: 0.12, duration: 0.25 },
  lightning: { intensity: 0.35, duration: 0.3 },
  wind:      { intensity: 0.15, duration: 0.35 },
  nature:    { intensity: 0.08, duration: 0.3 },
  shadow:    { intensity: 0.2, duration: 0.4 },
  galaxy:    { intensity: 0.22, duration: 0.5 },
  rainbow:   { intensity: 0.18, duration: 0.4 },
  neon:      { intensity: 0.18, duration: 0.3 },
};

class SpellEngine {
  /**
   * @param {import('./sceneEngine.js').SceneEngine} sceneEngine - existing scene instance
   * @param {import('./soundEngine.js').SoundEngine} soundEngine - existing sound instance
   */
  constructor(sceneEngine, soundEngine) {
    this.sceneEngine = sceneEngine;
    this.soundEngine = soundEngine;
  }

  /**
   * Shared cast pipeline used by every element-specific method below:
   * particle burst -> sound -> camera shake -> glow flash -> secondary burst.
   */
  _cast(element, x = 0.5, y = 0.5, power = 1) {
    const scene = this.sceneEngine;
    const sound = this.soundEngine;
    const shake = SHAKE_BY_ELEMENT[element] || { intensity: 0.2, duration: 0.35 };

    // 1. Particle animation (primary burst) — existing sceneEngine method.
    scene.spawnElementBurst(element, x, y);

    // 2. Sound effect — existing soundEngine method.
    sound.elementChoose(element);

    // 3. Camera shake — existing private helper on SceneEngine (accessible
    //    since JS doesn't enforce the leading-underscore convention; we are
    //    calling it rather than redefining it, so sceneEngine.js stays untouched).
    if (typeof scene._cameraShake === 'function') {
      scene._cameraShake(shake.intensity * power, shake.duration);
    }

    // 4. Glow flash — a softer, slightly delayed second burst at the same
    //    spot to read as a bloom/glow pulse layered over the main effect.
    setTimeout(() => {
      scene.spawnElementBurst(element, x, y);
    }, 90);

    // 5. Secondary particle animation pass — a third, smaller burst a beat
    //    later so the cast has a brief "settle" instead of one single pop.
    setTimeout(() => {
      scene.spawnElementBurst(element, x + (Math.random() - 0.5) * 0.04, y + (Math.random() - 0.5) * 0.04);
    }, 220);
  }

  castFireSpell(x, y, power)      { this._cast('fire', x, y, power); }
  castIceSpell(x, y, power)       { this._cast('ice', x, y, power); }
  castLightningSpell(x, y, power) { this._cast('lightning', x, y, power); }
  castWindSpell(x, y, power)      { this._cast('wind', x, y, power); }
  castNatureSpell(x, y, power)    { this._cast('nature', x, y, power); }
  castShadowSpell(x, y, power)    { this._cast('shadow', x, y, power); }
  castGalaxySpell(x, y, power)    { this._cast('galaxy', x, y, power); }
  castRainbowSpell(x, y, power)   { this._cast('rainbow', x, y, power); }
  castNeonSpell(x, y, power)      { this._cast('neon', x, y, power); }
}

export default SpellEngine;
export { SpellEngine };

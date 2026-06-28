// js/sceneEngine.js
// Three.js powered magical background + spell effects.
// Manages: ambient particle field, energy balls, fire blasts, draw trails,
// portals, and the spell-wheel elemental bursts.

const ELEMENT_COLORS = {
  fire:      0xff6a3d,
  ice:       0x8fe9ff,
  lightning: 0xfff066,
  wind:      0xd8f5e0,
  nature:    0x6fdc8c,
  shadow:    0x6b4fa0,
  galaxy:    0x9b5cff,
  rainbow:   0xff8ad8,
  neon:      0x39ffe0,
};

export class SceneEngine {
  constructor(canvas, quality = 'medium') {
    this.canvas = canvas;
    this.quality = quality;
    this.clock = new THREE.Clock();
    this.activeEffects = []; // { update(dt), mesh }

    this._initRenderer();
    this._initScene();
    this._initAmbientField();
    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 2 : 1.3));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 8);
    this.scene.add(new THREE.AmbientLight(0x6a4fff, 0.6));
    const point = new THREE.PointLight(0x9b6cff, 1.2, 30);
    point.position.set(0, 2, 6);
    this.scene.add(point);
  }

  // Soft floating ambient particles always drifting in the background.
  _initAmbientField() {
    const count = this.quality === 'low' ? 400 : this.quality === 'high' ? 2200 : 1100;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseColor = new THREE.Color(0x8b5cf6);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 4;
      const c = baseColor.clone().lerp(new THREE.Color(0x4fd1ff), Math.random());
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.045, vertexColors: true, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.ambientPoints = new THREE.Points(geo, mat);
    this.scene.add(this.ambientPoints);
  }

  setQuality(q) { this.quality = q; }

  /* ---------------- Public spell effects ---------------- */

  // ✋ Open palm: glowing energy ball that follows a normalized hand position.
  spawnEnergyBall(x, y, power = 1) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.35 * power, 24, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.55 });
    const core = new THREE.Mesh(geo, mat);
    group.add(core);

    const sparkCount = 60;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      const r = 0.4 * power + Math.random() * 0.25;
      const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI;
      sparkPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      sparkPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      sparkPos[i*3+2] = r * Math.cos(phi);
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({ color: 0x4fd1ff, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    group.add(sparks);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        group.rotation.y += dt * 1.4;
        group.rotation.x += dt * 0.6;
        const pulse = 1 + Math.sin(life.t * 6) * 0.08;
        core.scale.setScalar(pulse);
        mat.opacity = 0.55 * Math.max(0, 1 - life.t / 1.2);
        if (life.t > 1.2) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }

  // 👊 Fist held 3s: explosion burst.
  spawnFireBlast(x, y, power = 1) {
    const count = this.quality === 'low' ? 250 : 700;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
      const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI;
      const speed = (2 + Math.random() * 4) * power;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xff6a3d, size: 0.09, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    this._placeAtScreen(points, x, y);
    this.scene.add(points);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        const posAttr = points.geometry.attributes.position;
        for (let i = 0; i < count; i++) {
          posAttr.array[i*3]   += velocities[i].x * dt;
          posAttr.array[i*3+1] += (velocities[i].y - 1.2 * life.t) * dt; // gravity
          posAttr.array[i*3+2] += velocities[i].z * dt;
        }
        posAttr.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - life.t / 1.4);
        if (life.t > 1.4) this._removeEffect(effect, points);
      },
      mesh: points,
    };
    this.activeEffects.push(effect);
    this._cameraShake(0.25 * power, 0.35);
  }

  // ☝ One finger: glowing trail point.
  addTrailPoint(x, y, color = 0x4fd1ff) {
    if (!this._trail) this._trail = [];
    const geo = new THREE.SphereGeometry(0.045, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const dot = new THREE.Mesh(geo, mat);
    this._placeAtScreen(dot, x, y);
    this.scene.add(dot);
    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        mat.opacity = Math.max(0, 0.9 - life.t / 1.6);
        dot.scale.multiplyScalar(1 + dt * 0.3);
        if (life.t > 1.6) this._removeEffect(effect, dot);
      },
      mesh: dot,
    };
    this.activeEffects.push(effect);
  }

  // 🖐 Five fingers: swirling portal.
  spawnPortal(x, y) {
    if (this._portal) return; // single portal at a time
    const ringGeo = new THREE.TorusGeometry(0.7, 0.05, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x9b5cff, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const group = new THREE.Group();
    group.add(ring);

    const count = 300;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 0.1 + Math.random() * 0.6;
      const a = Math.random() * Math.PI * 2;
      positions[i*3] = Math.cos(a) * r;
      positions[i*3+1] = Math.sin(a) * r;
      positions[i*3+2] = (Math.random() - 0.5) * 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x4fd1ff, size: 0.04, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const swirl = new THREE.Points(geo, mat);
    group.add(swirl);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);
    this._portal = group;

    const effect = {
      update: (dt) => {
        ring.rotation.z += dt * 1.5;
        swirl.rotation.z -= dt * 2.2;
      },
      mesh: group,
      persistent: true,
    };
    this._portalEffect = effect;
    this.activeEffects.push(effect);
  }

  closePortal() {
    if (this._portal) {
      this._removeEffect(this._portalEffect, this._portal);
      this._portal = null;
    }
  }

  // ✌ Spell wheel chosen element burst.
  spawnElementBurst(element, x, y) {
    const color = ELEMENT_COLORS[element] ?? 0xffffff;
    const count = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      vel.push(new THREE.Vector3(Math.cos(theta) * speed, Math.sin(theta) * speed, (Math.random()-0.5) * speed));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geo, mat);
    this._placeAtScreen(points, x, y);
    this.scene.add(points);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        const arr = points.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
          arr[i*3]   += vel[i].x * dt;
          arr[i*3+1] += vel[i].y * dt;
          arr[i*3+2] += vel[i].z * dt;
        }
        points.geometry.attributes.position.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - life.t);
        if (life.t > 1) this._removeEffect(effect, points);
      },
      mesh: points,
    };
    this.activeEffects.push(effect);
  }

  // ❤️ Heart gesture: particle heart shape.
  spawnHeart(x, y) {
    const count = 400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      const scale = 0.06;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t);
      positions[i*3]   = hx * scale + (Math.random()-0.5)*0.05;
      positions[i*3+1] = hy * scale + (Math.random()-0.5)*0.05;
      positions[i*3+2] = (Math.random()-0.5) * 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xff6a9d, size: 0.06, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geo, mat);
    this._placeAtScreen(points, x, y);
    this.scene.add(points);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        points.rotation.z = Math.sin(life.t * 2) * 0.05;
        points.scale.setScalar(1 + Math.sin(life.t * 5) * 0.06);
        mat.opacity = Math.max(0, 0.95 - life.t / 2.2);
        if (life.t > 2.2) this._removeEffect(effect, points);
      },
      mesh: points,
    };
    this.activeEffects.push(effect);
  }

  // 🙌 Both hands: ultimate mode — lightning + galaxy storm.
  spawnUltimate() {
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1;
      setTimeout(() => this.spawnElementBurst(['fire','lightning','galaxy','ice'][i % 4], x, y), i * 120);
    }
    this._cameraShake(0.4, 0.6);
  }

  _cameraShake(intensity, duration) {
    const original = this.camera.position.clone();
    const start = performance.now();
    const shake = () => {
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed > duration) { this.camera.position.copy(original); return; }
      this.camera.position.set(
        original.x + (Math.random()-0.5) * intensity,
        original.y + (Math.random()-0.5) * intensity,
        original.z
      );
      requestAnimationFrame(shake);
    };
    shake();
  }

  _placeAtScreen(obj, x, y) {
    // x, y normalized 0..1 (screen space) -> world space on a plane in front of camera
    const worldX = (x - 0.5) * 8;
    const worldY = -(y - 0.5) * 5;
    obj.position.set(worldX, worldY, 0);
  }

  _removeEffect(effect, mesh) {
    this.scene.remove(mesh);
    mesh.geometry?.dispose?.();
    mesh.traverse?.((c) => c.geometry?.dispose?.());
    const idx = this.activeEffects.indexOf(effect);
    if (idx >= 0) this.activeEffects.splice(idx, 1);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    const loop = () => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.ambientPoints.rotation.y += dt * 0.02;
      for (const fx of [...this.activeEffects]) fx.update(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* =========================================================
     NEW: element spell effects (appended — existing methods
     above are untouched). Each builds a small group of Three.js
     particle systems combining the sub-effects requested for
     that element, and registers a single activeEffects entry
     that drives all of them together.
     ========================================================= */

  // 🔥 Fire spell: explosion burst + rising smoke + heat-distortion shimmer.
  spawnFireSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Explosion: fast outward embers.
    const emberCount = 220;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberVel = [];
    for (let i = 0; i < emberCount; i++) {
      emberPos[i*3] = emberPos[i*3+1] = emberPos[i*3+2] = 0;
      const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI;
      const speed = (1.5 + Math.random() * 3) * power;
      emberVel.push(new THREE.Vector3(Math.sin(phi)*Math.cos(theta)*speed, Math.sin(phi)*Math.sin(theta)*speed, Math.cos(phi)*speed));
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({ color: 0xff6a3d, size: 0.08, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const embers = new THREE.Points(emberGeo, emberMat);
    group.add(embers);

    // Smoke: slow rising dark particles.
    const smokeCount = 80;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i*3] = (Math.random()-0.5) * 0.4;
      smokePos[i*3+1] = (Math.random()-0.5) * 0.4;
      smokePos[i*3+2] = (Math.random()-0.5) * 0.4;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({ color: 0x3a3a3a, size: 0.22, transparent: true, opacity: 0.5, depthWrite: false });
    const smoke = new THREE.Points(smokeGeo, smokeMat);
    group.add(smoke);

    // Heat distortion: a few large, slowly drifting translucent discs that shimmer via opacity flicker.
    const heatDiscs = [];
    for (let i = 0; i < 3; i++) {
      const discGeo = new THREE.CircleGeometry(0.5 + i * 0.2, 16);
      const discMat = new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.06, side: THREE.DoubleSide });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.z = -0.1 * i;
      group.add(disc);
      heatDiscs.push(disc);
    }

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        const ePos = embers.geometry.attributes.position.array;
        for (let i = 0; i < emberCount; i++) {
          ePos[i*3]   += emberVel[i].x * dt;
          ePos[i*3+1] += (emberVel[i].y - 0.6 * life.t) * dt;
          ePos[i*3+2] += emberVel[i].z * dt;
        }
        embers.geometry.attributes.position.needsUpdate = true;
        emberMat.opacity = Math.max(0, 1 - life.t / 1.3);

        const sPos = smoke.geometry.attributes.position.array;
        for (let i = 0; i < smokeCount; i++) sPos[i*3+1] += dt * 0.6;
        smoke.geometry.attributes.position.needsUpdate = true;
        smokeMat.opacity = Math.max(0, 0.5 - life.t / 2.2);

        heatDiscs.forEach((d, i) => { d.material.opacity = 0.06 + Math.sin(life.t * 8 + i) * 0.03; d.scale.setScalar(1 + Math.sin(life.t * 4 + i) * 0.08); });

        if (life.t > 2.2) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
    this._cameraShake(0.18 * power, 0.3);
  }

  // ❄️ Ice spell: falling snow + sparkling ice crystals + slow drifting frozen particles.
  spawnIceSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Snow: gently falling white points.
    const snowCount = 150;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPos[i*3] = (Math.random()-0.5) * 1.4;
      snowPos[i*3+1] = Math.random() * 1.2;
      snowPos[i*3+2] = (Math.random()-0.5) * 1.4;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.9 });
    const snow = new THREE.Points(snowGeo, snowMat);
    group.add(snow);

    // Ice crystals: small bright shards (tetrahedrons) rotating in place.
    const crystals = [];
    for (let i = 0; i < 10; i++) {
      const crystalGeo = new THREE.TetrahedronGeometry(0.06 + Math.random() * 0.05);
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.9 });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set((Math.random()-0.5) * 1, (Math.random()-0.5) * 1, (Math.random()-0.5) * 0.6);
      group.add(crystal);
      crystals.push(crystal);
    }

    // Frozen particles: slow drifting blue dust, barely moving.
    const frozenCount = 60;
    const frozenGeo = new THREE.BufferGeometry();
    const frozenPos = new Float32Array(frozenCount * 3);
    for (let i = 0; i < frozenCount; i++) {
      frozenPos[i*3] = (Math.random()-0.5) * 1.6;
      frozenPos[i*3+1] = (Math.random()-0.5) * 1.6;
      frozenPos[i*3+2] = (Math.random()-0.5) * 1.6;
    }
    frozenGeo.setAttribute('position', new THREE.BufferAttribute(frozenPos, 3));
    const frozenMat = new THREE.PointsMaterial({ color: 0x4fd1ff, size: 0.035, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const frozen = new THREE.Points(frozenGeo, frozenMat);
    group.add(frozen);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        const sPos = snow.geometry.attributes.position.array;
        for (let i = 0; i < snowCount; i++) {
          sPos[i*3+1] -= dt * (0.3 + power * 0.1);
          if (sPos[i*3+1] < -0.6) sPos[i*3+1] = 1.2;
        }
        snow.geometry.attributes.position.needsUpdate = true;

        crystals.forEach((c, i) => { c.rotation.x += dt * (0.6 + i * 0.05); c.rotation.y += dt * 0.4; });

        frozen.rotation.y += dt * 0.05;
        snowMat.opacity = frozenMat.opacity = Math.max(0, 0.9 - life.t / 2.6);
        crystals.forEach((c) => { c.material.opacity = Math.max(0, 0.9 - life.t / 2.6); });

        if (life.t > 2.6) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }

  // ⚡ Lightning spell: jagged bolt + bright flash + camera shake.
  spawnLightningSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Bolt: jagged line from top to the cast point.
    const segments = 10;
    const boltPoints = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      boltPoints.push(new THREE.Vector3((Math.random()-0.5) * 0.3 * (1 - t), 2 - t * 2, (Math.random()-0.5) * 0.2));
    }
    const boltGeo = new THREE.BufferGeometry().setFromPoints(boltPoints);
    const boltMat = new THREE.LineBasicMaterial({ color: 0xfff066, transparent: true, opacity: 1 });
    const bolt = new THREE.Line(boltGeo, boltMat);
    group.add(bolt);

    // Flash: bright expanding disc at the strike point.
    const flashGeo = new THREE.CircleGeometry(0.4, 24);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    group.add(flash);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        boltMat.opacity = Math.max(0, 1 - life.t / 0.25);
        flash.scale.setScalar(1 + life.t * 6 * power);
        flashMat.opacity = Math.max(0, 0.9 - life.t / 0.3);
        if (life.t > 0.5) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
    this._cameraShake(0.3 * power, 0.25); // camera shake
  }

  // 🌪️ Wind spell: spiraling tornado + tumbling leaves + drifting dust.
  spawnWindSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Tornado: spiral of points rising and rotating.
    const tornadoCount = 200;
    const tornadoGeo = new THREE.BufferGeometry();
    const tornadoPos = new Float32Array(tornadoCount * 3);
    const tornadoAngle = [], tornadoHeight = [], tornadoRadius = [];
    for (let i = 0; i < tornadoCount; i++) {
      tornadoAngle.push(Math.random() * Math.PI * 2);
      tornadoHeight.push(Math.random() * 1.6 - 0.6);
      tornadoRadius.push(0.1 + Math.random() * 0.5);
    }
    tornadoGeo.setAttribute('position', new THREE.BufferAttribute(tornadoPos, 3));
    const tornadoMat = new THREE.PointsMaterial({ color: 0xd8f5e0, size: 0.045, transparent: true, opacity: 0.7 });
    const tornado = new THREE.Points(tornadoGeo, tornadoMat);
    group.add(tornado);

    // Leaves: small tumbling green/brown planes.
    const leafColors = [0x6fdc8c, 0x8a5a32];
    const leaves = [];
    for (let i = 0; i < 8; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.08, 0.05);
      const leafMat = new THREE.MeshBasicMaterial({ color: leafColors[i % 2], side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set((Math.random()-0.5) * 1, (Math.random()-0.5) * 1, (Math.random()-0.5) * 0.5);
      group.add(leaf);
      leaves.push(leaf);
    }

    // Dust: faint drifting points.
    const dustCount = 70;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i*3] = (Math.random()-0.5) * 1.8;
      dustPos[i*3+1] = (Math.random()-0.5) * 1.8;
      dustPos[i*3+2] = (Math.random()-0.5) * 1.8;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xc9c9b8, size: 0.025, transparent: true, opacity: 0.4 });
    const dust = new THREE.Points(dustGeo, dustMat);
    group.add(dust);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        const tPos = tornado.geometry.attributes.position.array;
        for (let i = 0; i < tornadoCount; i++) {
          tornadoAngle[i] += dt * (3 + power);
          tPos[i*3]   = Math.cos(tornadoAngle[i]) * tornadoRadius[i];
          tPos[i*3+1] = tornadoHeight[i];
          tPos[i*3+2] = Math.sin(tornadoAngle[i]) * tornadoRadius[i];
        }
        tornado.geometry.attributes.position.needsUpdate = true;

        leaves.forEach((leaf, i) => { leaf.rotation.z += dt * (2 + i * 0.2); leaf.position.x += Math.sin(life.t * 2 + i) * dt * 0.3; });

        dust.rotation.y += dt * 0.4;

        const fade = Math.max(0, 1 - life.t / 1.8);
        tornadoMat.opacity = 0.7 * fade;
        dustMat.opacity = 0.4 * fade;
        leaves.forEach((leaf) => { leaf.material.opacity = 0.9 * fade; });

        if (life.t > 1.8) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }

  // 🌿 Nature spell: floating leaves + blooming flowers + a growing vine.
  spawnNatureSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Leaves: drifting green planes.
    const leaves = [];
    for (let i = 0; i < 10; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.07, 0.04);
      const leafMat = new THREE.MeshBasicMaterial({ color: 0x6fdc8c, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set((Math.random()-0.5) * 1.2, (Math.random()-0.5) * 1.2, (Math.random()-0.5) * 0.5);
      group.add(leaf);
      leaves.push(leaf);
    }

    // Flowers: small colored points blooming outward.
    const flowerColors = [0xff8ad8, 0xffd27a, 0xffffff];
    const flowers = [];
    for (let i = 0; i < 12; i++) {
      const flowerGeo = new THREE.CircleGeometry(0.04, 8);
      const flowerMat = new THREE.MeshBasicMaterial({ color: flowerColors[i % flowerColors.length], side: THREE.DoubleSide, transparent: true, opacity: 0 });
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set((Math.random()-0.5) * 1, (Math.random()-0.5) * 1, (Math.random()-0.5) * 0.4);
      group.add(flower);
      flowers.push(flower);
    }

    // Vine: a growing curved line made of stacked segments.
    const vinePoints = [];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      vinePoints.push(new THREE.Vector3(Math.sin(t * 6) * 0.15, -0.6 + t * 1.2, 0));
    }
    const vineGeo = new THREE.BufferGeometry().setFromPoints(vinePoints);
    const vineMat = new THREE.LineBasicMaterial({ color: 0x3f8f4f, transparent: true, opacity: 0.9 });
    const vine = new THREE.Line(vineGeo, vineMat);
    vine.geometry.setDrawRange(0, 0); // grows over time
    group.add(vine);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        leaves.forEach((leaf, i) => { leaf.position.y += Math.sin(life.t * 2 + i) * dt * 0.2; leaf.rotation.z += dt * 0.5; });
        flowers.forEach((flower, i) => {
          const bloomT = Math.max(0, Math.min(1, life.t * power - i * 0.05));
          flower.scale.setScalar(bloomT);
          flower.material.opacity = bloomT * 0.95;
        });
        const grow = Math.min(16, Math.floor(life.t * 14));
        vine.geometry.setDrawRange(0, grow);

        const fade = Math.max(0, 1 - life.t / 2.4);
        leaves.forEach((leaf) => { leaf.material.opacity = 0.9 * fade; });
        vineMat.opacity = 0.9 * fade;

        if (life.t > 2.4) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }

  // 🌑 Shadow spell: roiling black smoke + pulsing purple aura ring.
  spawnShadowSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Black smoke: dark rising particles.
    const smokeCount = 140;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i*3] = (Math.random()-0.5) * 0.8;
      smokePos[i*3+1] = (Math.random()-0.5) * 0.8;
      smokePos[i*3+2] = (Math.random()-0.5) * 0.8;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({ color: 0x140014, size: 0.16, transparent: true, opacity: 0.7, depthWrite: false });
    const smoke = new THREE.Points(smokeGeo, smokeMat);
    group.add(smoke);

    // Purple aura: a pulsing torus ring around the cast point.
    const auraGeo = new THREE.TorusGeometry(0.4, 0.03, 12, 48);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x6b4fa0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    group.add(aura);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        const sPos = smoke.geometry.attributes.position.array;
        for (let i = 0; i < smokeCount; i++) {
          sPos[i*3+1] += dt * 0.4;
          sPos[i*3] += Math.sin(life.t * 3 + i) * dt * 0.1;
        }
        smoke.geometry.attributes.position.needsUpdate = true;

        aura.rotation.z += dt * (1.2 * power);
        aura.scale.setScalar(1 + Math.sin(life.t * 4) * 0.1);

        const fade = Math.max(0, 1 - life.t / 2.2);
        smokeMat.opacity = 0.7 * fade;
        auraMat.opacity = 0.8 * fade;

        if (life.t > 2.2) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }

  // 🌌 Galaxy spell: twinkling stars + glowing nebula cloud + rotating vortex arms.
  spawnGalaxySpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Stars: small twinkling points.
    const starCount = 200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = Math.random() * 1.2;
      const a = Math.random() * Math.PI * 2;
      starPos[i*3] = Math.cos(a) * r;
      starPos[i*3+1] = Math.sin(a) * r;
      starPos[i*3+2] = (Math.random()-0.5) * 0.6;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.9 });
    const stars = new THREE.Points(starGeo, starMat);
    group.add(stars);

    // Nebula: soft colored cloud blob.
    const nebulaGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const nebulaMat = new THREE.MeshBasicMaterial({ color: 0x9b5cff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    group.add(nebula);

    // Galaxy vortex: rotating spiral arm points.
    const armCount = 150;
    const armGeo = new THREE.BufferGeometry();
    const armPos = new Float32Array(armCount * 3);
    const armAngle = [], armRadius = [];
    for (let i = 0; i < armCount; i++) {
      armAngle.push((i / armCount) * Math.PI * 6);
      armRadius.push((i / armCount) * 0.9);
    }
    armGeo.setAttribute('position', new THREE.BufferAttribute(armPos, 3));
    const armMat = new THREE.PointsMaterial({ color: 0x4fd1ff, size: 0.05, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
    const arms = new THREE.Points(armGeo, armMat);
    group.add(arms);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        stars.rotation.z += dt * 0.2;
        starMat.opacity = 0.6 + Math.sin(life.t * 6) * 0.3;

        nebula.rotation.y += dt * 0.3;
        nebula.scale.setScalar(1 + Math.sin(life.t * 2) * 0.06);

        const aPos = arms.geometry.attributes.position.array;
        for (let i = 0; i < armCount; i++) {
          const angle = armAngle[i] + life.t * (0.8 * power);
          aPos[i*3]   = Math.cos(angle) * armRadius[i];
          aPos[i*3+1] = Math.sin(angle) * armRadius[i];
          aPos[i*3+2] = 0;
        }
        arms.geometry.attributes.position.needsUpdate = true;

        const fade = Math.max(0, 1 - life.t / 2.6);
        nebulaMat.opacity = 0.15 * fade;
        armMat.opacity = 0.85 * fade;

        if (life.t > 2.6) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }

  // 🌈 Rainbow spell: vertical rainbow beam + multicolor particle burst.
  spawnRainbowSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();
    const bandColors = [0xff4d4d, 0xff944d, 0xffd24d, 0x7be37c, 0x4fd1ff, 0x8b5cf6];

    // Rainbow beam: stacked colored translucent planes forming a vertical beam.
    const beamSegments = [];
    bandColors.forEach((color, i) => {
      const segGeo = new THREE.PlaneGeometry(0.18, 2);
      const segMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const seg = new THREE.Mesh(segGeo, segMat);
      seg.position.x = (i - bandColors.length / 2) * 0.05;
      group.add(seg);
      beamSegments.push(seg);
    });

    // Rainbow particles: multicolor burst.
    const count = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
      const c = new THREE.Color(bandColors[i % bandColors.length]);
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
      const theta = Math.random() * Math.PI * 2;
      const speed = (1.5 + Math.random() * 2.5) * power;
      vel.push(new THREE.Vector3(Math.cos(theta) * speed, Math.sin(theta) * speed, (Math.random()-0.5) * speed));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(geo, mat);
    group.add(particles);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        beamSegments.forEach((seg, i) => { seg.material.opacity = Math.max(0, 0.5 - life.t / 1.5) * (0.8 + Math.sin(life.t * 6 + i) * 0.2); });

        const arr = particles.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
          arr[i*3]   += vel[i].x * dt;
          arr[i*3+1] += vel[i].y * dt;
          arr[i*3+2] += vel[i].z * dt;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - life.t / 1.4);

        if (life.t > 1.5) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }

  // 💠 Neon spell: bright laser beam + pulsing neon glow halo.
  spawnNeonSpell(x = 0.5, y = 0.5, power = 1) {
    const group = new THREE.Group();

    // Laser: thin, very bright vertical beam.
    const laserGeo = new THREE.PlaneGeometry(0.06, 3);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x39ffe0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const laser = new THREE.Mesh(laserGeo, laserMat);
    group.add(laser);

    // Neon glow: soft halo sphere pulsing around the beam origin.
    const glowGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x39ffe0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    this._placeAtScreen(group, x, y);
    this.scene.add(group);

    const life = { t: 0 };
    const effect = {
      update: (dt) => {
        life.t += dt;
        laser.scale.x = 1 + Math.sin(life.t * 20) * 0.15 * power;
        laserMat.opacity = Math.max(0, 0.9 - life.t / 1.2);

        glow.scale.setScalar(1 + Math.sin(life.t * 6) * 0.2);
        glowMat.opacity = Math.max(0, 0.3 - life.t / 1.2);

        if (life.t > 1.2) this._removeEffect(effect, group);
      },
      mesh: group,
    };
    this.activeEffects.push(effect);
  }
}

export { ELEMENT_COLORS };

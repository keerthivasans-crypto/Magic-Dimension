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
}

export { ELEMENT_COLORS };

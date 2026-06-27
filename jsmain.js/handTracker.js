// js/handTracker.js
// Wraps MediaPipe Hands: webcam setup, landmark detection, skeleton drawing, FPS.

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],          // thumb
  [0,5],[5,6],[6,7],[7,8],          // index
  [0,9],[9,10],[10,11],[11,12],     // middle
  [0,13],[13,14],[14,15],[15,16],   // ring
  [0,17],[17,18],[18,19],[19,20],   // pinky
  [5,9],[9,13],[13,17],             // palm
];

export class HandTracker {
  /**
   * @param {HTMLVideoElement} videoEl
   * @param {HTMLCanvasElement} skeletonCanvas - small preview canvas
   * @param {Function} onResults - callback({hands, handedness, fps})
   */
  constructor(videoEl, skeletonCanvas, onResults) {
    this.video = videoEl;
    this.canvas = skeletonCanvas;
    this.ctx = skeletonCanvas.getContext('2d');
    this.onResults = onResults;
    this.mirror = true;
    this.showSkeleton = true;

    this._frameTimes = [];
    this._lastTime = performance.now();

    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
    });
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    this.hands.onResults((results) => this._handleResults(results));
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();

    this.camera = new Camera(this.video, {
      onFrame: async () => { await this.hands.send({ image: this.video }); },
      width: 640,
      height: 480,
    });
    this.camera.start();
  }

  stop() {
    this.camera?.stop?.();
    const stream = this.video.srcObject;
    stream?.getTracks?.().forEach((t) => t.stop());
  }

  setMirror(val) { this.mirror = val; }
  setShowSkeleton(val) { this.showSkeleton = val; }

  _handleResults(results) {
    // FPS calc
    const now = performance.now();
    const delta = now - this._lastTime;
    this._lastTime = now;
    this._frameTimes.push(delta);
    if (this._frameTimes.length > 20) this._frameTimes.shift();
    const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
    const fps = Math.round(1000 / avg);

    this._drawSkeleton(results.multiHandLandmarks || []);

    this.onResults({
      hands: results.multiHandLandmarks || [],
      handedness: results.multiHandedness || [],
      fps,
    });
  }

  _drawSkeleton(handsLandmarks) {
    const ctx = this.ctx;
    const w = this.canvas.width = this.canvas.clientWidth * (window.devicePixelRatio || 1);
    const h = this.canvas.height = this.canvas.clientHeight * (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    if (!this.showSkeleton) return;

    ctx.save();
    if (this.mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }

    for (const landmarks of handsLandmarks) {
      ctx.strokeStyle = 'rgba(139,92,246,0.9)';
      ctx.lineWidth = 2;
      for (const [a, b] of CONNECTIONS) {
        const pa = landmarks[a], pb = landmarks[b];
        ctx.beginPath();
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
        ctx.stroke();
      }
      for (const p of landmarks) {
        ctx.fillStyle = 'rgba(79,209,255,0.95)';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

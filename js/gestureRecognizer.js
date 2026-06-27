// js/gestureRecognizer.js
// Classifies a single hand's 21 landmarks into a named gesture.
// Landmarks follow MediaPipe's indexing (0 = wrist, 4/8/12/16/20 = fingertips).

const TIP = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const MCP = { thumb: 2, index: 5, middle: 9, ring: 13, pinky: 17 };
const WRIST = 0;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z||0) - (b.z||0));
}

// Returns true if a finger is "extended" (tip far from wrist relative to its MCP joint).
function isExtended(landmarks, tipIdx, mcpIdx) {
  const tip = landmarks[tipIdx], mcp = landmarks[mcpIdx], wrist = landmarks[WRIST];
  return dist(tip, wrist) > dist(mcp, wrist) * 1.15;
}

function fingerStates(landmarks) {
  return {
    thumb:  dist(landmarks[TIP.thumb], landmarks[17]) > dist(landmarks[MCP.thumb], landmarks[17]) * 1.05,
    index:  isExtended(landmarks, TIP.index, MCP.index),
    middle: isExtended(landmarks, TIP.middle, MCP.middle),
    ring:   isExtended(landmarks, TIP.ring, MCP.ring),
    pinky:  isExtended(landmarks, TIP.pinky, MCP.pinky),
  };
}

/**
 * Classify a single hand into a gesture name + confidence score (0..1).
 * @param {Array} landmarks - 21 normalized landmark points for one hand
 * @returns {{name:string, confidence:number, fingers:object}}
 */
export function recognizeGesture(landmarks) {
  const f = fingerStates(landmarks);
  const extendedCount = Object.values(f).filter(Boolean).length;

  // Thumb up / down: only thumb extended, others curled, check vertical direction.
  if (f.thumb && !f.index && !f.middle && !f.ring && !f.pinky) {
    const thumbTip = landmarks[TIP.thumb], wrist = landmarks[WRIST];
    const isUp = thumbTip.y < wrist.y - 0.05;
    const isDown = thumbTip.y > wrist.y + 0.05;
    if (isUp) return { name: 'thumb_up', confidence: 0.85, fingers: f };
    if (isDown) return { name: 'thumb_down', confidence: 0.85, fingers: f };
  }

  // Heart gesture approximation: thumb + index tips touching, forming a loop, other fingers curled.
  const thumbIndexDist = dist(landmarks[TIP.thumb], landmarks[TIP.index]);
  if (thumbIndexDist < 0.05 && !f.middle && !f.ring && !f.pinky) {
    return { name: 'heart', confidence: 0.7, fingers: f };
  }

  if (extendedCount === 0) {
    return { name: 'fist', confidence: 0.9, fingers: f };
  }
  if (extendedCount === 5) {
    return { name: 'open_palm', confidence: 0.92, fingers: f };
  }
  if (f.index && !f.middle && !f.ring && !f.pinky) {
    return { name: 'one_finger', confidence: 0.85, fingers: f };
  }
  if (f.index && f.middle && !f.ring && !f.pinky) {
    return { name: 'two_fingers', confidence: 0.85, fingers: f };
  }
  if (f.index && f.middle && f.ring && !f.pinky) {
    return { name: 'three_fingers', confidence: 0.8, fingers: f };
  }
  if (f.index && f.middle && f.ring && f.pinky && !f.thumb) {
    return { name: 'four_fingers', confidence: 0.78, fingers: f };
  }

  return { name: 'unknown', confidence: 0.4, fingers: f };
}

/**
 * Smooths gesture classification over consecutive frames to avoid flicker.
 * Requires the same gesture to be seen `requiredFrames` times before firing.
 */
export class GestureStabilizer {
  constructor(requiredFrames = 4) {
    this.requiredFrames = requiredFrames;
    this.history = [];
    this.current = null;
  }

  push(gestureName) {
    this.history.push(gestureName);
    if (this.history.length > this.requiredFrames) this.history.shift();
    const allSame = this.history.length === this.requiredFrames &&
      this.history.every((g) => g === this.history[0]);
    if (allSame && this.current !== this.history[0]) {
      this.current = this.history[0];
      return { changed: true, gesture: this.current };
    }
    return { changed: false, gesture: this.current };
  }

  reset() { this.history = []; this.current = null; }
}

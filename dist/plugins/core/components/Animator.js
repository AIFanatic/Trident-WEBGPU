import { Component } from './Component.js';

class AnimationClip {
  name;
  channels;
  duration;
  constructor(name, channels, duration) {
    this.name = name;
    this.channels = channels;
    this.duration = duration;
  }
}
const tmpV3 = new Float32Array(3);
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function v3Lerp(a, b, t, out = tmpV3) {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  return out;
}
function quatNormalize(q) {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  q[0] /= l;
  q[1] /= l;
  q[2] /= l;
  q[3] /= l;
  return q;
}
function quatSlerp(a, b, t, out = new Float32Array(4)) {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (1 - cos < 1e-6) {
    out[0] = lerp(ax, bx, t);
    out[1] = lerp(ay, by, t);
    out[2] = lerp(az, bz, t);
    out[3] = lerp(aw, bw, t);
    return quatNormalize(out);
  }
  const theta = Math.acos(cos);
  const s = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / s;
  const w2 = Math.sin(t * theta) / s;
  out[0] = ax * w1 + bx * w2;
  out[1] = ay * w1 + by * w2;
  out[2] = az * w1 + bz * w2;
  out[3] = aw * w1 + bw * w2;
  return out;
}
class Animator extends Component {
  clips;
  playing;
  clipIndex;
  time;
  speed;
  previousTime;
  constructor(gameObject, clips = []) {
    super(gameObject);
    this.clips = clips;
    this.playing = false;
    this.clipIndex = 0;
    this.time = 0;
    this.speed = 1;
    this.previousTime = 0;
  }
  getCurrentClip() {
    return this.clips[this.clipIndex] || null;
  }
  setClipByIndex(i) {
    this.clipIndex = Math.max(0, Math.min(i, this.clips.length - 1));
    this.time = 0;
  }
  play() {
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
  stop() {
    this.playing = false;
    this.time = 0;
  }
  Start() {
    this.previousTime = performance.now();
  }
  Update() {
    const currentTime = performance.now();
    const dt = (currentTime - this.previousTime) / 1e3;
    this.previousTime = currentTime;
    if (!this.playing || !this.getCurrentClip()) return;
    this.time += dt * this.speed;
    this.apply(this.getCurrentClip(), this.time);
  }
  sampleSampler(sampler, t, out) {
    const times = sampler.times;
    const lastT = times[sampler.keyCount - 1];
    let time = sampler.keyCount > 1 ? t % lastT : 0;
    let i1 = 0;
    while (i1 < sampler.keyCount && times[i1] < time) ++i1;
    if (i1 === 0) i1 = 1;
    if (i1 >= sampler.keyCount) i1 = sampler.keyCount - 1;
    const i0 = i1 - 1;
    const t0 = times[i0], t1 = times[i1];
    const u = t1 > t0 ? (time - t0) / (t1 - t0) : 0;
    const c = sampler.compCount;
    const base0 = i0 * c;
    const base1 = i1 * c;
    if (c === 4 && out.length === 4) {
      const qa = sampler.values.subarray(base0, base0 + 4);
      const qb = sampler.values.subarray(base1, base1 + 4);
      quatSlerp(qa, qb, u, out);
    } else if (c === 3 && out.length === 3) {
      const a = sampler.values.subarray(base0, base0 + 3);
      const b = sampler.values.subarray(base1, base1 + 3);
      v3Lerp(a, b, u, out);
    } else {
      for (let k = 0; k < out.length; ++k) {
        out[k] = lerp(sampler.values[base0 + k], sampler.values[base1 + k], u);
      }
    }
  }
  apply(clip, time) {
    for (const ch of clip.channels) {
      switch (ch.path) {
        case "translation":
          this.sampleSampler(ch.sampler, time, ch.targetTransform.position);
          break;
        case "scale":
          this.sampleSampler(ch.sampler, time, ch.targetTransform.scale);
          break;
        case "rotation":
          this.sampleSampler(ch.sampler, time, ch.targetTransform.rotation);
          quatNormalize(ch.targetTransform.rotation);
          break;
      }
    }
  }
}

export { AnimationClip, Animator };

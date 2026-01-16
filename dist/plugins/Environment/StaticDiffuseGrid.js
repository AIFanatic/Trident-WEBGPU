import { Component, Mathf, GPU, Components } from '@trident/core';

class StaticDiffuseGrid extends Component {
  static type = "@trident/plugins/Environment/StaticDiffuseGrid";
  origin = new Mathf.Vector3(0, 0, 0);
  spacing = new Mathf.Vector3(1, 1, 1);
  counts = { x: 1, y: 1, z: 1 };
  data = new Float32Array([0, 0, 0]);
  irradianceCube;
  lastColor = new Float32Array([NaN, NaN, NaN]);
  writePixel = new Float16Array(4);
  SetGrid(origin, spacing, counts, data) {
    this.origin.copy(origin);
    this.spacing.copy(spacing);
    this.counts = counts;
    this.data = data;
  }
  SetConstant(color) {
    this.counts = { x: 1, y: 1, z: 1 };
    this.data = new Float32Array([color.x, color.y, color.z]);
  }
  Start() {
    this.irradianceCube = GPU.RenderTextureCube.Create(1, 1, 6, "rgba16float", 1);
    this.irradianceCube.SetName("StaticDiffuseGrid_Irradiance");
  }
  Update() {
    if (!this.irradianceCube) return;
    if (!Components.Camera.mainCamera) return;
    const color = this.sampleTrilinear(Components.Camera.mainCamera.transform.position);
    if (this.shouldUpdate(color)) {
      this.writeConstantCube(color);
      this.lastColor.set(color);
    }
    this.gameObject.scene.renderPipeline.skyboxIrradiance = this.irradianceCube;
  }
  shouldUpdate(color) {
    const dx = Math.abs(color[0] - this.lastColor[0]);
    const dy = Math.abs(color[1] - this.lastColor[1]);
    const dz = Math.abs(color[2] - this.lastColor[2]);
    return dx > 1e-3 || dy > 1e-3 || dz > 1e-3;
  }
  writeConstantCube(color) {
    this.writePixel[0] = color[0];
    this.writePixel[1] = color[1];
    this.writePixel[2] = color[2];
    this.writePixel[3] = 1;
    for (let face = 0; face < 6; face++) {
      this.irradianceCube.SetSubData(this.writePixel, 1, 1, 0, 0, 0, face);
    }
  }
  sampleTrilinear(pos) {
    const counts = this.counts;
    const sx = this.spacing.x || 1;
    const sy = this.spacing.y || 1;
    const sz = this.spacing.z || 1;
    const gx = (pos.x - this.origin.x) / sx;
    const gy = (pos.y - this.origin.y) / sy;
    const gz = (pos.z - this.origin.z) / sz;
    const x0 = this.clampInt(Math.floor(gx), 0, counts.x - 1);
    const y0 = this.clampInt(Math.floor(gy), 0, counts.y - 1);
    const z0 = this.clampInt(Math.floor(gz), 0, counts.z - 1);
    const x1 = this.clampInt(x0 + 1, 0, counts.x - 1);
    const y1 = this.clampInt(y0 + 1, 0, counts.y - 1);
    const z1 = this.clampInt(z0 + 1, 0, counts.z - 1);
    const tx = this.clamp01(gx - x0);
    const ty = this.clamp01(gy - y0);
    const tz = this.clamp01(gz - z0);
    const c000 = this.getColor(x0, y0, z0);
    const c100 = this.getColor(x1, y0, z0);
    const c010 = this.getColor(x0, y1, z0);
    const c110 = this.getColor(x1, y1, z0);
    const c001 = this.getColor(x0, y0, z1);
    const c101 = this.getColor(x1, y0, z1);
    const c011 = this.getColor(x0, y1, z1);
    const c111 = this.getColor(x1, y1, z1);
    return this.triLerp(c000, c100, c010, c110, c001, c101, c011, c111, tx, ty, tz);
  }
  getColor(x, y, z) {
    const idx = ((z * this.counts.y + y) * this.counts.x + x) * 3;
    const d = this.data;
    return new Float32Array([d[idx] || 0, d[idx + 1] || 0, d[idx + 2] || 0]);
  }
  triLerp(c000, c100, c010, c110, c001, c101, c011, c111, tx, ty, tz) {
    const c00 = this.lerp3(c000, c100, tx);
    const c10 = this.lerp3(c010, c110, tx);
    const c01 = this.lerp3(c001, c101, tx);
    const c11 = this.lerp3(c011, c111, tx);
    const c0 = this.lerp3(c00, c10, ty);
    const c1 = this.lerp3(c01, c11, ty);
    return this.lerp3(c0, c1, tz);
  }
  lerp3(a, b, t) {
    const it = 1 - t;
    return new Float32Array([
      a[0] * it + b[0] * t,
      a[1] * it + b[1] * t,
      a[2] * it + b[2] * t
    ]);
  }
  clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }
  clampInt(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }
}

export { StaticDiffuseGrid };

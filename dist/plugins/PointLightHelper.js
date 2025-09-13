import { Component } from '@trident/core';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';

class PointLightHelper extends Component {
  lineRenderer;
  light;
  constructor(gameObject) {
    super(gameObject);
    this.lineRenderer = gameObject.AddComponent(LineRenderer);
    const positions = [];
    const r = 1;
    const segs = 64;
    for (let i = 0, j = 1; i < segs; i++, j++) {
      const a1 = i / segs * Math.PI * 2;
      const a2 = j / segs * Math.PI * 2;
      positions.push(
        r * Math.cos(a1),
        r * Math.sin(a1),
        0,
        r * Math.cos(a2),
        r * Math.sin(a2),
        0
      );
      positions.push(
        r * Math.cos(a1),
        0,
        r * Math.sin(a1),
        r * Math.cos(a2),
        0,
        r * Math.sin(a2)
      );
      positions.push(
        0,
        r * Math.cos(a1),
        r * Math.sin(a1),
        0,
        r * Math.cos(a2),
        r * Math.sin(a2)
      );
    }
    this.lineRenderer.SetPositions(new Float32Array(positions));
  }
  Start() {
    if (!this.light) throw Error("SpotLightHelper.light not defined");
  }
  Update() {
    this.transform.position.copy(this.light.transform.position);
    this.transform.rotation.copy(this.light.transform.rotation);
    this.transform.scale.set(this.light.range, this.light.range, this.light.range);
  }
}

export { PointLightHelper };

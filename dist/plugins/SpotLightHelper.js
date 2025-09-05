import { Component, Mathf } from '@trident/core';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';

class SpotLightHelper extends Component {
  lineRenderer;
  light;
  constructor(gameObject) {
    super(gameObject);
    this.lineRenderer = gameObject.AddComponent(LineRenderer);
    const positions = [
      0,
      0,
      0,
      0,
      0,
      -1,
      0,
      0,
      0,
      1,
      0,
      -1,
      0,
      0,
      0,
      -1,
      0,
      -1,
      0,
      0,
      0,
      0,
      1,
      -1,
      0,
      0,
      0,
      0,
      -1,
      -1
    ];
    for (let i = 0, j = 1, l = 32; i < l; i++, j++) {
      const p1 = i / l * Math.PI * 2;
      const p2 = j / l * Math.PI * 2;
      positions.push(
        Math.cos(p1),
        Math.sin(p1),
        -1,
        Math.cos(p2),
        Math.sin(p2),
        -1
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
    const coneLength = this.light.range ? this.light.range : 1e3;
    const coneWidth = coneLength * Math.tan(this.light.angle);
    this.transform.scale.set(coneWidth, coneWidth, coneLength);
    this.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
  }
}

export { SpotLightHelper };

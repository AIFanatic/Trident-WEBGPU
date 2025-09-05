import { Component, Mathf } from '@trident/core';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';

class DirectionalLightHelper extends Component {
  lineRenderer;
  light;
  constructor(gameObject) {
    super(gameObject);
    this.lineRenderer = gameObject.AddComponent(LineRenderer);
    const positions = [
      -1,
      -1,
      0,
      -1,
      1,
      0,
      -1,
      1,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      1,
      -1,
      0,
      1,
      -1,
      0,
      -1,
      -1,
      0,
      0,
      0,
      0,
      0,
      0,
      -1
    ];
    this.lineRenderer.SetPositions(new Float32Array(positions));
  }
  Start() {
    if (!this.light) throw Error("DirectionalLightHelper.light not defined");
  }
  Update() {
    this.transform.position.copy(this.light.transform.position);
    this.transform.rotation.copy(this.light.transform.rotation);
    this.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
  }
}

export { DirectionalLightHelper };

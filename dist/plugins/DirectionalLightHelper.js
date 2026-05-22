import { Component, Components } from '@trident/core';
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
    const light = this.gameObject.GetComponent(Components.DirectionalLight);
    if (!light) throw Error("DirectionalLightHelper.light not defined");
    this.light = light;
  }
}

export { DirectionalLightHelper };

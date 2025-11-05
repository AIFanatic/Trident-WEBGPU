import { Component } from '@trident/core';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';

class Box3DHelper extends Component {
  lineRenderer;
  box;
  constructor(gameObject) {
    super(gameObject);
    this.lineRenderer = gameObject.AddComponent(LineRenderer);
    const positions = [
      // Front face (z = 0.5)
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      // Back face (z = -0.5)
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      // Connections between front & back faces
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5
    ];
    this.lineRenderer.SetPositions(new Float32Array(positions));
  }
  Start() {
    if (!this.box) throw Error("Box3DHelper.box not defined");
  }
  Update() {
    this.box.getCenter(this.transform.position);
  }
}

export { Box3DHelper };
